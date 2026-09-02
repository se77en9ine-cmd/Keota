import { Router } from 'express';
import { AccountingController } from '../controllers/accounting.controller';
import { LedgerController } from '../controllers/ledger.controller';
import { CashFlowController } from '../controllers/cashFlow.controller';
import { authenticateToken } from '../middlewares/auth';
import { requireRoles } from '../middlewares/rbac';
import { auditLog } from '../middlewares/auditLogger';

const router = Router();

// --- Expenses & Incomes ---
router.get('/expenses', authenticateToken, AccountingController.getExpenses);
router.post('/expenses', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT'), auditLog('ADD_EXPENSE', 'ACCOUNTING'), AccountingController.addExpense);
router.delete('/expenses/:id', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT'), auditLog('DELETE_EXPENSE', 'ACCOUNTING'), AccountingController.deleteExpense);

router.get('/income', authenticateToken, AccountingController.getIncome);
router.post('/income', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT'), auditLog('ADD_INCOME', 'ACCOUNTING'), AccountingController.addIncome);
router.delete('/income/:id', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'MANAGER', 'ACCOUNTANT'), auditLog('DELETE_INCOME', 'ACCOUNTING'), AccountingController.deleteIncome);

router.get('/daily-closing', authenticateToken, AccountingController.getDailyClosings);
router.post('/daily-closing', authenticateToken, auditLog('RECORD_CLOSING', 'ACCOUNTING'), AccountingController.recordClosing);

// --- Cash Flow Auto Summarizer ---
router.get('/cash-flow', authenticateToken, CashFlowController.getCashFlowSummary);

// --- General Ledger, Chart of Accounts & Trial Balance ---
router.get('/chart-of-accounts', authenticateToken, LedgerController.getChartOfAccounts);
router.post('/chart-of-accounts', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'ACCOUNTANT'), auditLog('CREATE_ACCOUNT', 'ACCOUNTING'), LedgerController.createAccount);

router.get('/journal-entries', authenticateToken, LedgerController.getJournalEntries);
router.post('/journal-entries', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'ACCOUNTANT'), auditLog('MANUAL_JOURNAL_VOUCHER', 'ACCOUNTING'), LedgerController.postManualJournal);
router.delete('/journal-entries/:id', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'ACCOUNTANT'), auditLog('DELETE_JOURNAL_VOUCHER', 'ACCOUNTING'), LedgerController.deleteJournalEntry);
router.post('/journal-entries/purge-orphans', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'ACCOUNTANT'), auditLog('PURGE_ORPHANED_JOURNALS', 'ACCOUNTING'), LedgerController.purgeOrphanedJournals);

router.get('/general-ledger', authenticateToken, LedgerController.getGeneralLedger);
router.get('/trial-balance', authenticateToken, LedgerController.getTrialBalance);
router.get('/trial-balance-extended', authenticateToken, LedgerController.getExtendedTrialBalance);
router.get('/balance-sheet', authenticateToken, LedgerController.getBalanceSheet);

// --- Financial Statement Period Closures & Multi-Period Summaries ---
router.get('/periods', authenticateToken, LedgerController.getAccountingPeriods);
router.post('/periods/close', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER', 'ACCOUNTANT'), auditLog('CLOSE_ACCOUNTING_PERIOD', 'ACCOUNTING'), LedgerController.closePeriod);
router.post('/periods/:id/reopen', authenticateToken, requireRoles('SUPER_ADMIN', 'OWNER'), auditLog('REOPEN_ACCOUNTING_PERIOD', 'ACCOUNTING'), LedgerController.reopenPeriod);
router.get('/period-summaries', authenticateToken, LedgerController.getPeriodSummaries);

export default router;

