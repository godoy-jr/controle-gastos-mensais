import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "../constants/finance.js";
import { createId, getToday } from "../utils/finance.js";

export default function useTransactionForm({ setTransactions, setActivePage }) {
    const [type, setType] = useState("income");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(getToday);
    const [category, setCategory] = useState(CATEGORIES.income[0]);
    const [editingId, setEditingId] = useState(null);
    const [feedback, setFeedback] = useState("");
    const formRef = useRef(null);

    useEffect(() => {
        if (type === "income" && !CATEGORIES.income.includes(category)) setCategory(CATEGORIES.income[0]);
        if (type === "expense" && !CATEGORIES.expense.includes(category)) setCategory(CATEGORIES.expense[0]);
    }, [type, category]);

    const resetForm = () => {
        setEditingId(null);
        setType("income");
        setDescription("");
        setAmount("");
        setDate(getToday());
        setCategory(CATEGORIES.income[0]);
        setFeedback("");
    };

    const submitTransaction = event => {
        event.preventDefault();
        const normalizedDescription = description.trim().replace(/\s+/g, " ");
        const numericAmount = Number(amount);
        if (!normalizedDescription || numericAmount <= 0 || !date) return;
        const formData = { description: normalizedDescription, amount: numericAmount, type, category, date };
        if (editingId) {
            setTransactions(saved => saved.map(item => item.id === editingId ? { ...item, ...formData } : item));
            setFeedback("Movimentação atualizada com sucesso.");
        } else {
            setTransactions(saved => [...saved, { id: createId(), ...formData }]);
            setFeedback("Movimentação adicionada com sucesso.");
        }
        resetForm();
        setFeedback(editingId ? "Movimentação atualizada com sucesso." : "Movimentação adicionada com sucesso.");
        window.setTimeout(() => setFeedback(""), 2500);
    };

    const editTransaction = item => {
        setActivePage("transactions");
        setEditingId(item.id);
        setType(item.type);
        setDescription(item.description);
        setAmount(String(item.amount));
        setDate(item.date);
        setCategory(item.category);
        setFeedback("");
        window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
    };

    const duplicateTransaction = item => {
        setActivePage("transactions");
        setEditingId(null);
        setType(item.type);
        setDescription(item.description);
        setAmount(String(item.amount));
        setDate(getToday());
        setCategory(item.category);
        setFeedback("Revise os dados e confirme para criar uma nova movimentação.");
        window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
    };

    const deleteTransaction = id => {
        setTransactions(saved => saved.filter(item => item.id !== id));
        if (editingId === id) resetForm();
    };

    return {
        formRef,
        type,
        setType,
        description,
        setDescription,
        amount,
        setAmount,
        date,
        setDate,
        category,
        setCategory,
        editingId,
        feedback,
        setFeedback,
        resetForm,
        submitTransaction,
        editTransaction,
        duplicateTransaction,
        deleteTransaction
    };
}
