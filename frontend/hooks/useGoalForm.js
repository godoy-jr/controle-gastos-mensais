import { useState } from "react";
import { CATEGORIES } from "../constants/finance.js";
import { createId } from "../utils/finance.js";

export default function useGoalForm({ goals, setGoals, month }) {
    const [goalCategory, setGoalCategory] = useState(CATEGORIES.expense[0]);
    const [goalLimit, setGoalLimit] = useState("");

    const submitGoal = event => {
        event.preventDefault();
        const limit = Number(goalLimit);
        if (limit <= 0) return;
        setGoals(saved => {
            const existing = saved.find(goal => goal.month === month && goal.category === goalCategory);
            return existing
                ? saved.map(goal => goal.id === existing.id ? { ...goal, limit } : goal)
                : [...saved, { id: createId(), month, category: goalCategory, limit }];
        });
        setGoalLimit("");
    };

    const removeGoal = id => setGoals(saved => saved.filter(item => item.id !== id));

    return { goalCategory, setGoalCategory, goalLimit, setGoalLimit, submitGoal, removeGoal };
}
