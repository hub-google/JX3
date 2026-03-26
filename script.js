// JX3 Blog Logic - GitHub Pages (Static) Version




// --- 配置區 ---
const SUPABASE_URL = 'https://fanffwnhkxpfhttylntw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fsrieSLUXlq-_WDpPY9K_w_eO-dN_jT'; 




// 初始化 Supabase 客戶端
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;




const JX3Blog = {
    async init() {
        if (!supabaseClient) {
            this.showError("Supabase SDK 載入失敗。");
            return;
        }




        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('id');




        if (articleId) {
            this.renderPost(articleId);
        } else {
            this.renderHome();
        }
    },




    showError(msg) {
        const root = document.getElementById('root');
        if (root) {
            root.innerHTML = `
                <div class="max-w-2xl mx-auto py-32 text-center px-6">
                    <h2 class="text-2xl font-black mb-4 text-slate-900">載入出錯</h2>
                    <p class="text-slate-500 mb-8 leading-relaxed">${msg}</p>
                    <a href="https://hub-google.github.io/JX3/" class="inline-block bg-slate-900 text-white px-8 py-3 rounded-full font-bold hover:bg-amber-600 transition">返回目錄</a>
                </div>`;
        }
