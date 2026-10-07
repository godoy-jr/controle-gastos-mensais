import { useEffect, useState } from "react";

function loadArray(key) {
    try {
        const saved = JSON.parse(localStorage.getItem(key));
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

export default function useStoredArray(key) {
    const [items, setItems] = useState(() => loadArray(key));

    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(items));
    }, [items, key]);

    return [items, setItems];
}
