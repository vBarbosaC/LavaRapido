const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let accessToken = localStorage.getItem("mg_token") || "";

export function setSupabaseToken(token) {
    accessToken = token || "";
}

export function hasSupabaseConfig() {
    return Boolean(
        supabaseUrl
        && supabaseKey
        && !supabaseUrl.includes("sua-url")
        && !supabaseKey.includes("sua-chave")
    );
}

function getHeaders() {
    const headers = {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Prefer: "return=representation"
    };

    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    return headers;
}

async function getErrorMessage(response) {
    try {
        const data = await response.json();
        const message = data.message || data.msg || data.error_description || data.details || "";

        if (message.toLowerCase().includes("permission denied")) {
            return "Nao foi possivel acessar os dados do sistema.";
        }

        if (message.toLowerCase().includes("duplicate key")) {
            return "Este registro ja esta cadastrado.";
        }

        if (message.toLowerCase().includes("invalid login credentials")) {
            return "E-mail ou senha incorretos.";
        }

        return message || "Nao foi possivel concluir a operacao.";
    } catch {
        return "Nao foi possivel concluir a operacao.";
    }
}

export async function supabaseRequest(path, options = {}) {
    const response = await fetch(`${supabaseUrl}${path}`, {
        ...options,
        headers: {
            ...getHeaders(),
            ...options.headers
        }
    });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}
