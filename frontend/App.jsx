import { useState } from "react";
import { PAGE_DETAILS } from "./constants/finance.js";
import Sidebar from "./components/Sidebar.jsx";
import PageHeader from "./components/PageHeader.jsx";
import DashboardPages from "./components/DashboardPages.jsx";
import useFinanceData from "./hooks/useFinanceData.js";
import useGoalForm from "./hooks/useGoalForm.js";
import useThemePreferences from "./hooks/useThemePreferences.js";
import useTransactionForm from "./hooks/useTransactionForm.js";
import { comparisonText, exportTransactionsCsv, formatMoney } from "./utils/finance.js";

function App() {
    const [activePage, setActivePage] = useState("overview");
    const financeData = useFinanceData();
    const transactionForm = useTransactionForm({
        setTransactions: financeData.setTransactions,
        setActivePage
    });
    const goalForm = useGoalForm({
        goals: financeData.goals,
        setGoals: financeData.setGoals,
        month: financeData.month
    });
    const themePreferences = useThemePreferences();
    const exportCsv = () => {
        if (!financeData.visibleTransactions.length) {
            transactionForm.setFeedback("Não há movimentações para exportar.");
            return;
        }
        exportTransactionsCsv(financeData.visibleTransactions, financeData.month);
    };

    const [pageTitle, pageDescription] = PAGE_DETAILS[activePage];

    return (
        <div className="app-layout">
            <Sidebar activePage={activePage} onNavigate={setActivePage} />
            <main className="app-content">
                <PageHeader
                    title={pageTitle}
                    description={pageDescription}
                    appearance={themePreferences}
                    month={financeData.month}
                    setMonth={financeData.setMonth}
                />
                <DashboardPages
                    activePage={activePage}
                    finance={{
                        ...financeData,
                        formatMoney,
                        comparisonText
                    }}
                    transactionForm={transactionForm}
                    goalForm={goalForm}
                    onExportCsv={exportCsv}
                />
            </main>
        </div>
    );
}

export default App;
