const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export async function apiRequest(path, { token, signal, ...options } = {}) {
    const response = await fetch(`${API_BASE}/api${path}`, {
        ...options,
        signal,
        headers: {
            accept: "application/json",
            ...(options.body ? { "content-type": "application/json" } : {}),
            ...(token ? { authorization: `Bearer ${token}` } : {}),
            ...options.headers
        }
    });
    let data = null;
    if (response.status !== 204) {
        try {
            data = await response.json();
        } catch {
            throw new Error("Não foi possível conectar à API financeira. Verifique se o backend está em execução.");
        }
    }
    if (!response.ok) {
        throw new Error(data?.error || `A API respondeu com erro (${response.status}).`);
    }
    return data;
}
