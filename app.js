// --- Supabase 설정 ---
// TODO: 실제 Supabase URL과 Anon Key로 교체해야 합니다.
const SUPABASE_URL = 'https://djoaxjkblxcyshyjsfam.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqb2F4amtibHhjeXNoeWpzZmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNzA5MjgsImV4cCI6MjA3MjY0NjkyOH0.bXsB_6tb7N57J3uHqbSvVHixVv2zqe9fex8EELSUddg';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM 요소 가져오기 ---
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const userInfo = document.getElementById('user-info');
const saveWorkOrderBtn = document.getElementById('save-work-order-btn');

const customerNameInput = document.getElementById('customer-name');
const vehicleNumberInput = document.getElementById('vehicle-number');

// --- 모달 및 관련 버튼 DOM 요소 ---
const addCustomerBtn = document.getElementById('add-customer-btn');
const addVehicleBtn = document.getElementById('add-vehicle-btn');
const addCompanyBtn = document.getElementById('add-company-btn');
const saveCustomerBtn = document.getElementById('save-customer-btn');
const saveCompanyBtn = document.getElementById('save-company-btn');
const saveVehicleBtn = document.getElementById('save-vehicle-btn');

const customerTypeSelect = document.getElementById('new-customer-type');
const companyInfoSection = document.getElementById('company-info-section');
const newCarCouponCheckbox = document.getElementById('new-car-coupon-checkbox');
const couponUploadSection = document.getElementById('coupon-upload-section');

// 자동완성 관련 DOM 요소
const newVehicleModelInput = document.getElementById('new-vehicle-model');
const carModelAutocompleteResults = document.getElementById('car-model-autocomplete-results');


// --- 전역 상태 변수 ---
let currentUser = null;
let currentUserProfile = null;
let currentCustomer = null;
let currentVehicle = null;
let workCategories = [];
let selectedWorkItems = [];

// --- 함수 ---

function switchView(viewId) {
    document.querySelectorAll('#app-view main > div').forEach(view => {
        view.classList.add('hidden');
    });
    const viewToShow = document.getElementById(viewId);
    if (viewToShow) {
        viewToShow.classList.remove('hidden');
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function handleLogin() {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: emailInput.value,
        password: passwordInput.value,
    });
    if (error) {
        console.error('로그인 중 오류 발생:', error);
        alert('로그인 실패: ' + error.message);
    } else {
        currentUser = data.user;
        await setupAppView();
    }
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    currentUser = null;
    currentUserProfile = null;
    loginView.classList.remove('hidden');
    appView.classList.add('hidden');
    selectedWorkItems = [];
    currentCustomer = null;
    currentVehicle = null;
}

async function setupAppView() {
    loginView.classList.add('hidden');
    appView.classList.remove('hidden');
    const { data: userProfile, error } = await supabaseClient
        .from('users')
        .select('full_name, role')
        .eq('id', currentUser.id)
        .single();

    if (error) {
         console.error("사용자 프로필 로딩 실패:", error);
         currentUserProfile = { role: 'customer' };
    } else {
        currentUserProfile = userProfile;
    }

    userInfo.textContent = `${currentUserProfile.full_name || currentUser.email} (${currentUserProfile.role})`;
    
    if (currentUserProfile.role === 'admin' || currentUserProfile.role === 'employee') {
        await loadInitialData();
        switchView('dashboard-view');
    } else {
        switchView('customer-view');
    }
}

async function loadInitialData() {
    const { data, error } = await supabaseClient.from('work_categories').select('*');
    if (error) {
        console.error('작업 카테고리 로딩 실패:', error);
        return;
    }
    workCategories = data;
    const categoryContainer = document.querySelector('#work-order-create-view .flex-wrap');
    if (categoryContainer) {
        categoryContainer.innerHTML = '';
        workCategories.forEach(category => {
            const chip = document.createElement('span');
            chip.className = 'px-3 py-1 bg-gray-200 text-gray-800 rounded-full cursor-pointer hover:bg-gray-300';
            chip.textContent = category.category_name;
            chip.dataset.categoryId = category.id;
            categoryContainer.appendChild(chip);
        });
    }
}

async function checkUserSession() {
    const { data } = await supabaseClient.auth.getSession();
    if (data.session) {
        currentUser = data.session.user;
        await setupAppView();
    } else {
        loginView.classList.remove('hidden');
        appView.classList.add('hidden');
    }
}

async function handleSaveCustomer() {
    if (!currentUserProfile || !['admin', 'employee'].includes(currentUserProfile.role)) {
        alert('고객 정보를 저장할 권한이 없습니다.');
        return;
    }
    const name = document.getElementById('new-customer-name').value;
    const contact = document.getElementById('new-customer-contact').value;
    const type = document.getElementById('new-customer-type').value;
    if (!name || !contact) {
        alert('고객 이름과 연락처는 필수입니다.');
        return;
    }
    const { data, error } = await supabaseClient
        .from('customers')
        .insert({ full_name: name, phone_number: contact, customer_type: type })
        .select()
        .single();
    if (error) {
        console.error('고객 저장 실패:', error);
        alert('고객 정보 저장에 실패했습니다: ' + error.message);
    } else {
        alert('신규 고객이 등록되었습니다.');
        currentCustomer = data;
        customerNameInput.value = data.full_name;
        closeModal('add-customer-modal');
    }
}

async function handleSaveCompany() {
    if (!currentUserProfile || !['admin', 'employee'].includes(currentUserProfile.role)) {
        alert('회사 정보를 저장할 권한이 없습니다.');
        return;
    }
    const companyData = {
        company_name: document.getElementById('new-company-name').value,
        business_number: document.getElementById('new-company-business-number').value,
        address: document.getElementById('new-company-address').value,
        ceo_name: document.getElementById('new-company-ceo').value,
        corporate_number: document.getElementById('new-company-corporate-number').value,
        business_type: document.getElementById('new-company-type').value,
        business_item: document.getElementById('new-company-item').value,
        email: document.getElementById('new-company-email').value,
    };
    if (!companyData.company_name) {
        alert('회사명은 필수입니다.');
        return;
    }
    const { data, error } = await supabaseClient.from('companies').insert(companyData).select().single();
    if (error) {
        console.error('회사 정보 저장 실패:', error);
        alert('회사 정보 저장에 실패했습니다: ' + error.message);
    } else {
        alert('신규 회사가 등록되었습니다.');
        closeModal('add-company-modal');
    }
}

async function handleSaveVehicle() {
    if (!currentUserProfile || !['admin', 'employee'].includes(currentUserProfile.role)) {
        alert('차량 정보를 저장할 권한이 없습니다.');
        return;
    }

    const vehicleNumber = document.getElementById('new-vehicle-number').value;
    const vin = document.getElementById('new-vehicle-vin').value;
    const model = newVehicleModelInput.value; 

    if (!vehicleNumber || !model) {
        alert('차량번호와 차종은 필수입니다.');
        return;
    }
    if (!currentCustomer) {
        alert('먼저 고객을 선택하거나 등록해야 합니다.');
        return;
    }
    
    const { data: modelData, error: modelError } = await supabaseClient
        .from('car_models')
        .select('id')
        .eq('model_name', model)
        .single();

    if (modelError || !modelData) {
        alert(`'${model}'은(는) 등록되지 않은 차종입니다. 목록에서 선택하거나, 먼저 차종을 등록해주세요.`);
        return;
    }

    const { data, error } = await supabaseClient
        .from('vehicles')
        .insert({
            customer_id: currentCustomer.id,
            vehicle_number: vehicleNumber,
            vin: vin,
            car_model_id: modelData.id,
        })
        .select()
        .single();

    if (error) {
        console.error('차량 저장 실패:', error);
        alert('차량 정보 저장에 실패했습니다: ' + error.message);
    } else {
        alert('신규 차량이 등록되었습니다.');
        currentVehicle = data;
        vehicleNumberInput.value = data.vehicle_number;
        closeModal('add-vehicle-modal');
    }
}

async function handleSaveWorkOrder() {
    if (!currentCustomer || !currentVehicle || selectedWorkItems.length === 0) {
        alert('고객, 차량, 작업 항목을 모두 입력해주세요.');
        return;
    }
    const { data: orderData, error: orderError } = await supabaseClient
        .from('work_orders')
        .insert({
            customer_id: currentCustomer.id,
            vehicle_id: currentVehicle.id,
            status: 'waiting',
            total_amount: parseFloat(document.getElementById('total-amount').textContent),
        })
        .select().single();
    if (orderError) {
        console.error('작업지시서 저장 실패:', orderError);
        alert('작업지시서 저장에 실패했습니다: ' + orderError.message);
        return;
    }
    alert('작업지시서가 성공적으로 저장되었습니다.');
    switchView('dashboard-view');
}

async function handleCarModelInput(event) {
    const searchTerm = event.target.value;
    if (searchTerm.length < 1) {
        carModelAutocompleteResults.innerHTML = '';
        carModelAutocompleteResults.classList.add('hidden');
        return;
    }

    const { data, error } = await supabaseClient
        .from('car_models')
        .select('model_name')
        .ilike('model_name', `%${searchTerm}%`)
        .limit(10); 

    if (error) {
        console.error('차종 검색 오류:', error);
        return;
    }

    carModelAutocompleteResults.innerHTML = '';
    if (data.length > 0) {
        data.forEach(item => {
            const div = document.createElement('div');
            div.textContent = item.model_name;
            div.className = 'p-2 hover:bg-gray-100 cursor-pointer';
            div.onclick = () => {
                newVehicleModelInput.value = item.model_name;
                carModelAutocompleteResults.innerHTML = '';
                carModelAutocompleteResults.classList.add('hidden');
            };
            carModelAutocompleteResults.appendChild(div);
        });
        carModelAutocompleteResults.classList.remove('hidden');
    } else {
        carModelAutocompleteResults.classList.add('hidden');
    }
}

// --- 이벤트 리스너 설정 ---
document.addEventListener('DOMContentLoaded', checkUserSession);
loginBtn.addEventListener('click', handleLogin);
logoutBtn.addEventListener('click', handleLogout);
saveWorkOrderBtn.addEventListener('click', handleSaveWorkOrder);

saveCustomerBtn.addEventListener('click', handleSaveCustomer);
saveVehicleBtn.addEventListener('click', handleSaveVehicle);
saveCompanyBtn.addEventListener('click', handleSaveCompany);

addCustomerBtn.addEventListener('click', () => openModal('add-customer-modal'));
addVehicleBtn.addEventListener('click', () => openModal('add-vehicle-modal'));
addCompanyBtn.addEventListener('click', () => openModal('add-company-modal'));

document.querySelectorAll('.close-modal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const modal = e.target.closest('.fixed');
        if (modal) closeModal(modal.id);
    });
});

customerTypeSelect.addEventListener('change', () => {
    companyInfoSection.classList.toggle('hidden', customerTypeSelect.value === 'individual');
});

newCarCouponCheckbox.addEventListener('change', () => {
    couponUploadSection.classList.toggle('hidden', !newCarCouponCheckbox.checked);
});

newVehicleModelInput.addEventListener('input', handleCarModelInput);

document.addEventListener('click', (event) => {
    if (!newVehicleModelInput.contains(event.target) && !carModelAutocompleteResults.contains(event.target)) {
        carModelAutocompleteResults.classList.add('hidden');
    }
});

