package com.ardit.banking.account.service;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.security.SecureRandom;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.ardit.banking.account.config.AccountNumberingProperties;
import com.ardit.banking.account.domain.AccountEntity;
import com.ardit.banking.account.domain.AccountStatus;
import com.ardit.banking.account.domain.AccountType;
import com.ardit.banking.account.dto.AccountDetailsResponse;
import com.ardit.banking.account.dto.AccountResponse;
import com.ardit.banking.account.dto.CreateAccountRequest;
import com.ardit.banking.account.dto.UpdateAccountRequest;
import com.ardit.banking.account.repository.AccountRepository;
import com.ardit.banking.security.user.domain.UserEntity;
import com.ardit.banking.security.user.repository.UserRepository;
import com.ardit.banking.transaction.domain.TransactionDirection;
import com.ardit.banking.transaction.domain.TransactionEntity;
import com.ardit.banking.transaction.dto.TransactionResponse;
import com.ardit.banking.transaction.repository.TransactionRepository;
import com.ardit.banking.transaction.service.TransactionService;

@Service
public class AccountService {

    private static final BigDecimal ZERO_MONEY = new BigDecimal("0.00");

    private final AccountRepository accountRepository;
    private final UserRepository userRepository;
    private final TransactionService transactionService;
    private final TransactionRepository transactionRepository;
    private final AccountNumberingProperties accountNumberingProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    public AccountService(AccountRepository accountRepository, UserRepository userRepository,
                          TransactionService transactionService, TransactionRepository transactionRepository,
                          AccountNumberingProperties accountNumberingProperties) {
        this.accountRepository = accountRepository;
        this.userRepository = userRepository;
        this.transactionService = transactionService;
        this.transactionRepository = transactionRepository;
        this.accountNumberingProperties = accountNumberingProperties;
    }

    @Transactional
    public AccountResponse createAccountForUsername(String username, CreateAccountRequest request) {
        UserEntity owner = userRepository.findByUsernameAndActiveTrue(username)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
        String baseNumber = resolveOrAssignBaseNumber(owner);
        String accountClassCode = request.type().accountClassCode();
        int serialNumber = nextSerialNumber(owner.getId(), accountClassCode);
        String accountNumber = generateLocalAccountNumber(baseNumber, accountClassCode, serialNumber);
        String iban = generateIban(accountNumber);

        BigDecimal initialDeposit = request.initialDeposit().setScale(2, java.math.RoundingMode.HALF_EVEN);
        AccountEntity account = AccountEntity.open(
            accountNumber,
            iban,
            baseNumber,
            accountClassCode,
            serialNumber,
            request.type(),
            request.currency(),
            request.name(),
            initialDeposit,
            initialDeposit,
            ZERO_MONEY,
            defaultAnnualInterestRate(request.type()),
            owner
        );

        AccountEntity savedAccount = accountRepository.save(account);
        transactionService.recordOpeningDeposit(savedAccount, initialDeposit);
        return toResponse(savedAccount);
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> getAccountsForUsername(String username) {
        UserEntity owner = getOwnerByUsername(username);
        return accountRepository.findAllByOwnerIdOrderByOpenedAtAsc(owner.getId()).stream()
            .map(AccountService::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public AccountResponse getAccountForUsername(String username, Long accountId) {
        UserEntity owner = getOwnerByUsername(username);
        return accountRepository.findByIdAndOwnerId(accountId, owner.getId())
            .map(AccountService::toResponse)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    @Transactional(readOnly = true)
    public AccountDetailsResponse getAccountDetailsByNumberForUsername(String username, String accountNumber) {
        UserEntity owner = getOwnerByUsername(username);
        AccountEntity account = accountRepository.findByAccountNumberAndOwnerId(accountNumber, owner.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));

        List<TransactionEntity> transactions = transactionRepository.findStatementEntries(account.getId(), null, null);
        List<TransactionResponse> transactionResponses = transactions.stream()
            .map(AccountService::toTransactionResponse)
            .toList();

        BigDecimal totalCredits = transactions.stream()
            .filter(transaction -> transaction.getDirection() == TransactionDirection.CREDIT)
            .map(TransactionEntity::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, java.math.RoundingMode.HALF_EVEN);
        BigDecimal totalDebits = transactions.stream()
            .filter(transaction -> transaction.getDirection() == TransactionDirection.DEBIT)
            .map(TransactionEntity::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add)
            .setScale(2, java.math.RoundingMode.HALF_EVEN);

        return new AccountDetailsResponse(
            toResponse(account),
            transactionResponses.size(),
            totalCredits,
            totalDebits,
            totalCredits.subtract(totalDebits).setScale(2, java.math.RoundingMode.HALF_EVEN),
            transactionResponses
        );
    }

    @Transactional
    public AccountResponse updateAccountForUsername(String username, Long accountId, UpdateAccountRequest request) {
        AccountEntity account = getOwnedAccount(username, accountId);
        ensureAccountEditable(account);
        account.rename(request.name());
        return toResponse(account);
    }

    @Transactional
    public void closeAccountForUsername(String username, Long accountId) {
        AccountEntity account = getOwnedAccount(username, accountId);
        if (account.getStatus() == AccountStatus.CLOSED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Account is already closed");
        }
        if (account.getCurrentBalance().compareTo(BigDecimal.ZERO) != 0
            || account.getAvailableBalance().compareTo(BigDecimal.ZERO) != 0) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Account must have zero balances before closure"
            );
        }

        account.close(null);
    }

    private UserEntity getOwnerByUsername(String username) {
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found"));
    }

    private AccountEntity getOwnedAccount(String username, Long accountId) {
        UserEntity owner = getOwnerByUsername(username);
        return accountRepository.findByIdAndOwnerId(accountId, owner.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    private static void ensureAccountEditable(AccountEntity account) {
        if (account.getStatus() == AccountStatus.CLOSED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Closed accounts cannot be updated");
        }
    }

    private String resolveOrAssignBaseNumber(UserEntity owner) {
        if (owner.getBaseNumber() != null && !owner.getBaseNumber().isBlank()) {
            return owner.getBaseNumber();
        }

        String generatedBaseNumber;
        do {
            generatedBaseNumber = generateNumericString(accountNumberingProperties.baseNumberLength());
        } while (userRepository.existsByBaseNumber(generatedBaseNumber));

        owner.assignBaseNumber(generatedBaseNumber);
        return generatedBaseNumber;
    }

    private int nextSerialNumber(Long ownerId, String accountClassCode) {
        Integer currentMax = accountRepository.findMaxSerialNumberByOwnerIdAndAccountClassCode(ownerId, accountClassCode);
        int nextSerial = currentMax == null ? 1 : currentMax + 1;
        int maxSerial = (int) Math.pow(10, accountNumberingProperties.serialLength()) - 1;
        if (nextSerial > maxSerial) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No available serial number for account class");
        }
        return nextSerial;
    }

    private String generateLocalAccountNumber(String baseNumber, String accountClassCode, int serialNumber) {
        String serial = String.format("%0" + accountNumberingProperties.serialLength() + "d", serialNumber);
        String accountNumber = baseNumber + accountClassCode + serial;
        if (accountNumber.length() != accountNumberingProperties.localAccountNumberLength()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Invalid account number configuration");
        }
        return accountNumber;
    }

    private String generateIban(String accountNumber) {
        String countryCode = accountNumberingProperties.countryCode();
        String bban = accountNumberingProperties.bankCode()
            + leftPad(accountNumber, accountNumberingProperties.ibanAccountNumberLength());
        String rearranged = bban + countryCodeToNumeric(countryCode) + "00";
        int checksum = 98 - mod97(rearranged);
        return countryCode + String.format("%02d", checksum) + bban;
    }

    private String generateNumericString(int length) {
        String candidate;
        StringBuilder builder = new StringBuilder(length);
        builder.append(1 + secureRandom.nextInt(9));
        for (int index = 1; index < length; index++) {
            builder.append(secureRandom.nextInt(10));
        }
        candidate = builder.toString();
        return candidate;
    }

    private static String leftPad(String value, int targetLength) {
        return "0".repeat(Math.max(0, targetLength - value.length())) + value;
    }

    private static String countryCodeToNumeric(String countryCode) {
        StringBuilder builder = new StringBuilder();
        for (char character : countryCode.toUpperCase().toCharArray()) {
            builder.append(character - 'A' + 10);
        }
        return builder.toString();
    }

    private static int mod97(String numericValue) {
        BigInteger remainder = BigInteger.ZERO;
        for (char digit : numericValue.toCharArray()) {
            remainder = remainder.multiply(BigInteger.TEN)
                .add(BigInteger.valueOf(Character.digit(digit, 10)))
                .mod(BigInteger.valueOf(97));
        }
        return remainder.intValue();
    }

    private static BigDecimal defaultAnnualInterestRate(AccountType accountType) {
        return switch (accountType) {
            case CURRENT -> ZERO_MONEY.setScale(4, java.math.RoundingMode.HALF_EVEN);
            case SAVINGS -> new BigDecimal("1.2500");
            case SAVINGS_PLAN -> new BigDecimal("2.1000");
        };
    }

    private static AccountResponse toResponse(AccountEntity account) {
        return new AccountResponse(
            account.getId(),
            account.getAccountNumber(),
            account.getIban(),
            account.getType().name(),
            account.getCurrency().name(),
            account.getName(),
            account.getStatus().name(),
            account.getCurrentBalance(),
            account.getAvailableBalance(),
            account.getOverdraftLimit(),
            account.getAnnualInterestRate(),
            account.getOpenedAt(),
            account.getClosedAt()
        );
    }

    private static TransactionResponse toTransactionResponse(TransactionEntity transaction) {
        return new TransactionResponse(
            transaction.getId(),
            transaction.getTransactionReference(),
            transaction.getExternalReference(),
            transaction.getType().name(),
            transaction.getStatus().name(),
            transaction.getDirection().name(),
            transaction.getCurrency().name(),
            transaction.getAmount(),
            transaction.getDescription(),
            transaction.getCounterpartyName(),
            transaction.getCounterpartyAccount(),
            transaction.getBookingTimestamp(),
            transaction.getValueDate(),
            transaction.getBalanceAfter(),
            transaction.getFxRate(),
            transaction.getFxReferenceAmount(),
            transaction.getFxReferenceCurrency() == null ? null : transaction.getFxReferenceCurrency().name()
        );
    }
}
