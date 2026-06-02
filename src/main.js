import { hasSupabaseConfig, setSupabaseToken, supabaseRequest } from "./supabase.js";

const state = {
    token: localStorage.getItem("mg_token") || "",
    email: localStorage.getItem("mg_email") || "",
    loginMode: true,
    vehicleId: null
};

setSupabaseToken(state.token);

const $ = (id) => document.getElementById(id);

const authScreen = $("auth-screen");
const appScreen = $("app-screen");
const authForm = $("auth-form");
const authTitle = $("auth-title");
const authBtn = $("auth-btn");
const toggleAuthBtn = $("toggle-auth");
const toastContainer = $("toast-container");
const userDisplay = $("user-display");
const homeScreen = $("home-screen");
const operationScreen = $("operation-screen");
const navHomeBtn = $("nav-home");
const navOperationBtn = $("nav-operation");
const startOperationBtn = $("btn-start-operation");
const homeLogoutBtn = $("btn-home-logout");
const homeVehiclesCount = $("home-vehicles-count");
const homeServicesCount = $("home-services-count");
const homeProgressCount = $("home-progress-count");
const homeReadyCount = $("home-ready-count");
const homeTotalValue = $("home-total-value");
const homeStatus = $("home-status");
const logoutBtn = $("logout-btn");
const vehicleForm = $("vehicle-form");
const vehicleSearch = $("vehicle-search");
const vehiclesList = $("vehicles-list");
const serviceForm = $("service-form");
const servicesTableBody = $("services-table-body");
const selectedVehicleTitle = $("selected-vehicle-title");
const MAX_DB_INTEGER = 2147483647;
const LOCAL_ID_START = 1000000;
let currentVehicles = [];

function checkConfig() {
    if (hasSupabaseConfig()) return true;
    showToast("Nao foi possivel iniciar o sistema.", "error");
    return false;
}

function showError(title, error) {
    const message = error.message === "Email not confirmed"
        ? "Este cadastro ainda precisa ser confirmado antes do login."
        : error.message;

    showToast(`${title}: ${message}`, "error");
}

function showToast(message, type = "success") {
    const toast = document.createElement("div");
    const styles = {
        success: "border-emerald-300/30 bg-emerald-500/15 text-emerald-100",
        error: "border-red-300/30 bg-red-500/15 text-red-100",
        info: "border-sky-300/30 bg-sky-500/15 text-sky-100"
    };

    toast.className = `rounded-md border px-4 py-3 text-sm font-semibold shadow-xl backdrop-blur ${styles[type] || styles.success}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("opacity-0", "transition", "duration-300");
        setTimeout(() => toast.remove(), 350);
    }, 3000);
}

function isDataAccessError(error) {
    return error.message.includes("Nao foi possivel acessar os dados")
        || error.message.includes("Failed to fetch")
        || error.message.includes("fetch");
}

function isLocalId(id) {
    return Number(id) > MAX_DB_INTEGER;
}

function isLocalVehicleId(id) {
    const normalizedId = Number(id);
    return isLocalId(normalizedId) || getLocalVehicles().some((vehicle) => vehicle.id === normalizedId);
}

function isLocalServiceId(id) {
    const normalizedId = Number(id);
    return isLocalId(normalizedId) || getLocalServices().some((service) => service.id === normalizedId);
}

function readLocalData(key) {
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
        return [];
    }
}

function writeLocalData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function getLocalVehicles() {
    return readLocalData("mg_local_vehicles");
}

function getLocalServices() {
    return readLocalData("mg_local_services");
}

function getNextLocalId() {
    const nextId = Number(localStorage.getItem("mg_local_next_id")) || LOCAL_ID_START;
    localStorage.setItem("mg_local_next_id", String(nextId + 1));
    return nextId;
}

function saveLocalVehicle(payload, id) {
    const vehicles = getLocalVehicles();
    const normalizedId = id ? Number(id) : null;
    const exists = vehicles.some((vehicle) => vehicle.placa === payload.placa && vehicle.id !== normalizedId);

    if (exists) {
        throw new Error("Este veiculo ja esta cadastrado.");
    }

    if (normalizedId) {
        const updatedVehicles = vehicles.map((vehicle) => (
            vehicle.id === normalizedId ? { ...vehicle, ...payload } : vehicle
        ));
        writeLocalData("mg_local_vehicles", updatedVehicles);
        return;
    }

    vehicles.unshift({
        id: getNextLocalId(),
        ...payload
    });
    writeLocalData("mg_local_vehicles", vehicles);
}

function saveLocalService(payload, id) {
    const services = getLocalServices();
    const normalizedId = id ? Number(id) : null;

    if (normalizedId) {
        const updatedServices = services.map((service) => (
            service.id === normalizedId ? { ...service, ...payload } : service
        ));
        writeLocalData("mg_local_services", updatedServices);
        return;
    }

    services.unshift({
        id: getNextLocalId(),
        ...payload
    });
    writeLocalData("mg_local_services", services);
}

function getFilteredVehicles() {
    const query = vehicleSearch.value.trim().toLowerCase();

    if (!query) return currentVehicles;

    return currentVehicles.filter((vehicle) => (
        vehicle.placa.toLowerCase().includes(query)
        || vehicle.marca.toLowerCase().includes(query)
        || vehicle.modelo.toLowerCase().includes(query)
    ));
}

function renderVehicles(vehicles) {
    currentVehicles = vehicles;

    const filteredVehicles = getFilteredVehicles();
    vehiclesList.innerHTML = filteredVehicles.length
        ? ""
        : `<div class="rounded-md border border-white/10 bg-slate-900/70 p-3 text-xs font-semibold text-slate-400">Nenhum veiculo encontrado.</div>`;
    filteredVehicles.forEach(renderVehicle);
}

function updateHomeStats(vehicles = getLocalVehicles(), services = getLocalServices(), status = "Ativo") {
    const totalValue = services.reduce((total, service) => total + Number(service.preco || 0), 0);
    const progressCount = services.filter((service) => service.status_servico === "Em Andamento").length;
    const readyCount = services.filter((service) => service.status_servico === "Pronto para Entrega").length;

    homeVehiclesCount.textContent = vehicles.length;
    homeServicesCount.textContent = services.length;
    homeProgressCount.textContent = progressCount;
    homeReadyCount.textContent = readyCount;
    homeTotalValue.textContent = totalValue.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
    homeStatus.textContent = status;
}

async function loadHomeStats() {
    try {
        const vehicles = await supabaseRequest("/rest/v1/veiculos?select=id");
        const services = await supabaseRequest("/rest/v1/servicos_estetica?select=id,preco,status_servico");
        updateHomeStats(vehicles, services, "Ativo");
    } catch (error) {
        updateHomeStats(getLocalVehicles(), getLocalServices(), "Local");
    }
}

function showHome() {
    homeScreen.classList.remove("hidden");
    operationScreen.classList.add("hidden");
    navHomeBtn.className = "rounded-md border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-black uppercase text-amber-100 transition hover:bg-amber-300 hover:text-slate-950";
    navOperationBtn.className = "rounded-md border border-white/10 bg-slate-900 px-4 py-2 text-xs font-black uppercase text-slate-200 transition hover:bg-slate-800";
    loadHomeStats();
}

function showOperation() {
    homeScreen.classList.add("hidden");
    operationScreen.classList.remove("hidden");
    navHomeBtn.className = "rounded-md border border-white/10 bg-slate-900 px-4 py-2 text-xs font-black uppercase text-slate-200 transition hover:bg-slate-800";
    navOperationBtn.className = "rounded-md border border-amber-300/30 bg-amber-300/10 px-4 py-2 text-xs font-black uppercase text-amber-100 transition hover:bg-amber-300 hover:text-slate-950";
    loadVehicles();
}

function setAuthMode(loginMode) {
    state.loginMode = loginMode;
    authTitle.textContent = loginMode ? "MIDNIGHT GARAGE" : "CADASTRAR OPERADOR";
    authBtn.textContent = loginMode ? "Entrar no Sistema" : "Registrar Funcionario";
    toggleAuthBtn.textContent = loginMode
        ? "Primeiro acesso? Cadastre o funcionario"
        : "Ja possui cadastro? Faca o login";
}

function showScreen() {
    const logged = Boolean(state.token);
    authScreen.classList.toggle("hidden", logged);
    appScreen.classList.toggle("hidden", !logged);
    userDisplay.textContent = state.email;

    if (logged) showHome();
}

function saveSession(data) {
    const token = data.access_token || data.session?.access_token;
    const email = data.user?.email || data.session?.user?.email;

    if (!token || !email) {
        throw new Error("Nao foi possivel iniciar sua sessao. Tente novamente.");
    }

    state.token = token;
    state.email = email;
    setSupabaseToken(token);
    localStorage.setItem("mg_token", token);
    localStorage.setItem("mg_email", email);
    authForm.reset();
    showScreen();
}

async function signIn(email, password) {
    const data = await supabaseRequest("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });

    saveSession(data);
}

async function signUp(email, password) {
    await supabaseRequest("/auth/v1/signup", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });

    authForm.reset();
    setAuthMode(true);
    showToast("Cadastro realizado com sucesso. Faca login para entrar no sistema.");
}

async function loginOrSignup(event) {
    event.preventDefault();
    if (!checkConfig()) return;

    const email = $("auth-email").value;
    const password = $("auth-password").value;

    try {
        if (state.loginMode) {
            await signIn(email, password);
        } else {
            await signUp(email, password);
        }
    } catch (error) {
        showError("Erro de acesso", error);
    }
}

function logout() {
    state.token = "";
    state.email = "";
    state.vehicleId = null;
    setSupabaseToken("");
    localStorage.removeItem("mg_token");
    localStorage.removeItem("mg_email");
    showScreen();
}

async function loadVehicles() {
    if (!hasSupabaseConfig()) {
        renderVehicles(getLocalVehicles());
        updateHomeStats(getLocalVehicles(), getLocalServices(), "Local");
        return;
    }

    try {
        const vehicles = await supabaseRequest("/rest/v1/veiculos?select=*&order=id.desc");
        renderVehicles(vehicles);
    } catch (error) {
        if (isDataAccessError(error)) {
            renderVehicles(getLocalVehicles());
            updateHomeStats();
            return;
        }

        vehiclesList.innerHTML = `<div class="rounded-md border border-amber-300/20 bg-amber-300/10 p-3 text-xs font-semibold text-amber-100">Nao foi possivel carregar os veiculos no momento.</div>`;
    }
}

function renderVehicle(vehicle) {
    const item = document.createElement("div");
    const selected = state.vehicleId === vehicle.id;
    item.className = `flex items-center justify-between gap-3 rounded-md border p-3 transition ${
        selected ? "border-amber-300 bg-amber-300/10" : "border-white/10 bg-slate-900/60 hover:border-slate-500"
    }`;

    item.innerHTML = `
        <button type="button" class="vehicle-select flex-1 text-left">
            <span class="rounded border border-white/10 bg-slate-950 px-2 py-1 font-mono text-xs font-black uppercase text-amber-200">${vehicle.placa}</span>
            <h3 class="mt-2 text-sm font-black text-white">${vehicle.marca} ${vehicle.modelo}</h3>
        </button>
        <div class="flex shrink-0 gap-2">
            <button type="button" class="vehicle-edit rounded border border-sky-300/20 px-2 py-1 text-xs font-bold text-sky-200 hover:bg-sky-300/10">Editar</button>
            <button type="button" class="vehicle-delete rounded border border-red-300/20 px-2 py-1 text-xs font-bold text-red-200 hover:bg-red-400/10">Excluir</button>
        </div>
    `;

    item.querySelector(".vehicle-select").addEventListener("click", () => selectVehicle(vehicle));
    item.querySelector(".vehicle-edit").addEventListener("click", () => fillVehicleForm(vehicle));
    item.querySelector(".vehicle-delete").addEventListener("click", () => deleteVehicle(vehicle.id));
    vehiclesList.appendChild(item);
}

async function saveVehicle(event) {
    event.preventDefault();

    const id = $("vehicle-id").value;
    const path = id ? `/rest/v1/veiculos?id=eq.${id}` : "/rest/v1/veiculos";
    const method = id ? "PATCH" : "POST";
    const payload = {
        placa: $("vehicle-plate").value.toUpperCase(),
        marca: $("vehicle-brand").value,
        modelo: $("vehicle-model").value
    };

    try {
        if (!hasSupabaseConfig()) {
            saveLocalVehicle(payload, id);
            vehicleForm.reset();
            $("vehicle-id").value = "";
            loadVehicles();
            updateHomeStats(getLocalVehicles(), getLocalServices(), "Local");
            showToast("Veiculo salvo com sucesso.");
            return;
        }

        if (id && isLocalVehicleId(id)) {
            saveLocalVehicle(payload, id);
            vehicleForm.reset();
            $("vehicle-id").value = "";
            loadVehicles();
            updateHomeStats();
            showToast("Veiculo salvo com sucesso.");
            return;
        }

        await supabaseRequest(path, { method, body: JSON.stringify(payload) });
        vehicleForm.reset();
        $("vehicle-id").value = "";
        loadVehicles();
        updateHomeStats();
        showToast("Veiculo salvo com sucesso.");
    } catch (error) {
        if (isDataAccessError(error)) {
            try {
                saveLocalVehicle(payload, id);
                vehicleForm.reset();
                $("vehicle-id").value = "";
                loadVehicles();
                updateHomeStats();
                showToast("Veiculo salvo com sucesso.");
                return;
            } catch (localError) {
                showError("Nao foi possivel salvar o veiculo", localError);
                return;
            }
        }

        showError("Nao foi possivel salvar o veiculo", error);
    }
}

function fillVehicleForm(vehicle) {
    $("vehicle-id").value = vehicle.id;
    $("vehicle-plate").value = vehicle.placa;
    $("vehicle-brand").value = vehicle.marca;
    $("vehicle-model").value = vehicle.modelo;
}

async function deleteVehicle(id) {
    if (!confirm("Deseja remover este veiculo do atendimento?")) return;

    try {
        if (isLocalVehicleId(id)) {
            const normalizedId = Number(id);
            const vehicles = getLocalVehicles().filter((vehicle) => vehicle.id !== normalizedId);
            const services = getLocalServices().filter((service) => service.veiculo_id !== normalizedId);
            writeLocalData("mg_local_vehicles", vehicles);
            writeLocalData("mg_local_services", services);
            if (state.vehicleId === normalizedId) {
                state.vehicleId = null;
                selectedVehicleTitle.textContent = "Selecione um veiculo";
                serviceForm.classList.add("hidden");
            }
            loadVehicles();
            updateHomeStats();
            showToast("Veiculo removido com sucesso.");
            return;
        }

        await supabaseRequest(`/rest/v1/veiculos?id=eq.${id}`, { method: "DELETE" });
        if (state.vehicleId === id) {
            state.vehicleId = null;
            selectedVehicleTitle.textContent = "Selecione um veiculo";
            serviceForm.classList.add("hidden");
        }
        loadVehicles();
        updateHomeStats();
        showToast("Veiculo removido com sucesso.");
    } catch (error) {
        if (isDataAccessError(error)) {
            const normalizedId = Number(id);
            const vehicles = getLocalVehicles().filter((vehicle) => vehicle.id !== normalizedId);
            const services = getLocalServices().filter((service) => service.veiculo_id !== normalizedId);
            writeLocalData("mg_local_vehicles", vehicles);
            writeLocalData("mg_local_services", services);
            if (state.vehicleId === normalizedId) {
                state.vehicleId = null;
                selectedVehicleTitle.textContent = "Selecione um veiculo";
                serviceForm.classList.add("hidden");
            }
            loadVehicles();
            updateHomeStats();
            showToast("Veiculo removido com sucesso.");
            return;
        }

        showError("Nao foi possivel excluir o veiculo", error);
    }
}

function selectVehicle(vehicle) {
    state.vehicleId = vehicle.id;
    selectedVehicleTitle.textContent = `${vehicle.modelo} [${vehicle.placa}]`;
    serviceForm.classList.remove("hidden");
    loadVehicles();
    loadServices();
}

async function loadServices() {
    if (!state.vehicleId) return;

    if (!hasSupabaseConfig()) {
        const services = getLocalServices().filter((service) => service.veiculo_id === state.vehicleId);
        servicesTableBody.innerHTML = services.length
            ? ""
            : `<tr><td colspan="5" class="text-center py-6 text-slate-500">Nenhum servico pendente.</td></tr>`;
        services.forEach(renderService);
        updateHomeStats(getLocalVehicles(), getLocalServices(), "Local");
        return;
    }

    try {
        if (isLocalVehicleId(state.vehicleId)) {
            const services = getLocalServices().filter((service) => service.veiculo_id === state.vehicleId);
            servicesTableBody.innerHTML = services.length
                ? ""
                : `<tr><td colspan="5" class="text-center py-6 text-slate-500">Nenhum servico pendente.</td></tr>`;
            services.forEach(renderService);
            updateHomeStats();
            return;
        }

        const services = await supabaseRequest(`/rest/v1/servicos_estetica?veiculo_id=eq.${state.vehicleId}&order=id.desc`);
        servicesTableBody.innerHTML = services.length
            ? ""
            : `<tr><td colspan="5" class="text-center py-6 text-slate-500">Nenhum servico pendente.</td></tr>`;
        services.forEach(renderService);
    } catch (error) {
        if (isDataAccessError(error)) {
            const services = getLocalServices().filter((service) => service.veiculo_id === state.vehicleId);
            servicesTableBody.innerHTML = services.length
                ? ""
                : `<tr><td colspan="5" class="text-center py-6 text-slate-500">Nenhum servico pendente.</td></tr>`;
            services.forEach(renderService);
            updateHomeStats();
            return;
        }

        showError("Nao foi possivel carregar os servicos", error);
    }
}

function renderService(service) {
    const row = document.createElement("tr");
    row.className = "transition hover:bg-slate-900/70";
    row.innerHTML = `
        <td class="px-4 py-3"><div class="font-black text-white">${service.nome_servico}</div><div class="text-xs font-semibold text-slate-500">${service.categoria}</div></td>
        <td class="px-4 py-3 font-mono font-bold text-emerald-300">R$ ${Number(service.preco).toFixed(2)}</td>
        <td class="px-4 py-3 text-xs text-slate-300">${service.tempo_estimado} min</td>
        <td class="px-4 py-3"><span class="rounded border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] font-black uppercase text-amber-200">${service.status_servico}</span></td>
        <td class="px-4 py-3 text-right text-xs">
            <button type="button" class="service-edit rounded border border-sky-300/20 px-2 py-1 font-bold text-sky-200 hover:bg-sky-300/10">Editar</button>
            <button type="button" class="service-delete ml-2 rounded border border-red-300/20 px-2 py-1 font-bold text-red-200 hover:bg-red-400/10">Excluir</button>
        </td>
    `;

    row.querySelector(".service-edit").addEventListener("click", () => fillServiceForm(service));
    row.querySelector(".service-delete").addEventListener("click", () => deleteService(service.id));
    servicesTableBody.appendChild(row);
}

async function saveService(event) {
    event.preventDefault();
    if (!state.vehicleId) {
        showToast("Selecione um veiculo antes de salvar o servico.", "info");
        return;
    }

    const id = $("service-id").value;
    const path = id ? `/rest/v1/servicos_estetica?id=eq.${id}` : "/rest/v1/servicos_estetica";
    const method = id ? "PATCH" : "POST";
    const payload = {
        nome_servico: $("service-name").value,
        categoria: $("service-category").value,
        status_servico: $("service-status").value,
        preco: $("service-price").value,
        tempo_estimado: $("service-time").value,
        veiculo_id: state.vehicleId
    };

    try {
        if (!hasSupabaseConfig()) {
            saveLocalService(payload, id);
            resetServiceForm();
            loadServices();
            updateHomeStats(getLocalVehicles(), getLocalServices(), "Local");
            showToast("Servico salvo com sucesso.");
            return;
        }

        if (isLocalVehicleId(state.vehicleId) || (id && isLocalServiceId(id))) {
            saveLocalService(payload, id);
            resetServiceForm();
            loadServices();
            updateHomeStats();
            showToast("Servico salvo com sucesso.");
            return;
        }

        await supabaseRequest(path, { method, body: JSON.stringify(payload) });
        resetServiceForm();
        loadServices();
        updateHomeStats();
        showToast("Servico salvo com sucesso.");
    } catch (error) {
        if (isDataAccessError(error)) {
            saveLocalService(payload, id);
            resetServiceForm();
            loadServices();
            updateHomeStats();
            showToast("Servico salvo com sucesso.");
            return;
        }

        showError("Nao foi possivel salvar o servico", error);
    }
}

function fillServiceForm(service) {
    $("service-id").value = service.id;
    $("service-name").value = service.nome_servico;
    $("service-category").value = service.categoria;
    $("service-status").value = service.status_servico;
    $("service-price").value = service.preco;
    $("service-time").value = service.tempo_estimado;
}

async function deleteService(id) {
    if (!confirm("Remover este servico?")) return;

    try {
        if (isLocalServiceId(id)) {
            const normalizedId = Number(id);
            const services = getLocalServices().filter((service) => service.id !== normalizedId);
            writeLocalData("mg_local_services", services);
            loadServices();
            updateHomeStats();
            showToast("Servico removido com sucesso.");
            return;
        }

        await supabaseRequest(`/rest/v1/servicos_estetica?id=eq.${id}`, { method: "DELETE" });
        loadServices();
        updateHomeStats();
        showToast("Servico removido com sucesso.");
    } catch (error) {
        if (isDataAccessError(error)) {
            const normalizedId = Number(id);
            const services = getLocalServices().filter((service) => service.id !== normalizedId);
            writeLocalData("mg_local_services", services);
            loadServices();
            updateHomeStats();
            showToast("Servico removido com sucesso.");
            return;
        }

        showError("Nao foi possivel excluir o servico", error);
    }
}

function resetServiceForm() {
    $("service-id").value = "";
    $("service-name").value = "";
    $("service-price").value = "";
    $("service-time").value = "";
}

toggleAuthBtn.addEventListener("click", () => setAuthMode(!state.loginMode));
authForm.addEventListener("submit", loginOrSignup);
navHomeBtn.addEventListener("click", showHome);
navOperationBtn.addEventListener("click", showOperation);
startOperationBtn.addEventListener("click", showOperation);
homeLogoutBtn.addEventListener("click", logout);
logoutBtn.addEventListener("click", logout);
vehicleForm.addEventListener("submit", saveVehicle);
vehicleSearch.addEventListener("input", () => renderVehicles(currentVehicles));
serviceForm.addEventListener("submit", saveService);
$("btn-cancel-service").addEventListener("click", resetServiceForm);

showScreen();
