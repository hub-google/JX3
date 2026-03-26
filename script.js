// JX3 Blog Logic - GitHub Pages (Static) Version

// --- 配置區 ---
const SUPABASE_URL = 'https://fanffwnhkxpfhttylntw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fsrieSLUXlq-_WDpPY9K_w_eO-dN_jT'; 

let supabase = null;

const JX3Blog = {
    async init() {
        // 確保 Supabase SDK 已載入
        if (window.supabase) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }

        if (!supabase) {
            this.showError("資料庫連線代碼 (SDK) 載入中或失敗，請重新整理網頁。");
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
    },

    async renderHome() {
        const root = document.getElementById('root');
        if (!root) return;
        
        root.innerHTML = '<div class="flex justify-center py-32"><i class="fa-solid fa-spinner fa-spin text-4xl text-slate-300"></i></div>';

        try {
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("資料庫連線逾時。請確認：\n1. Supabase 的 RLS 政策已開啟此資料表的「公開讀取 (SELECT)」權限。\n2. 您的網路環境沒有封鎖 supabase.co。")), 8000)
            );

            // 資料表名稱：jx3_articles (全小寫)
            const { data: articles, error } = await Promise.race([
                supabase
                    .from('jx3_articles') 
                    .select('id, title, slug, summary, author, created_at')
                    .eq('is_hidden', 0)
                    .order('created_at', { ascending: false }),
                timeoutPromise
            ]);

            if (error) throw error;
            
            if (!articles || articles.length === 0) {
                root.innerHTML = '<p class="text-center text-slate-400 py-32">目前還沒有文章，請透過管理後台發布第一篇！</p>';
                return;
            }

            root.innerHTML = Templates.home(articles);
        } catch (e) {
            this.showError(e.message);
        }
    },

    async renderPost(id) {
        const root = document.getElementById('root');
        if (!root) return;

        root.innerHTML = '<div class="flex justify-center py-32"><i class="fa-solid fa-spinner fa-spin text-4xl text-slate-300"></i></div>';

        try {
            const { data: post, error: pError } = await supabase
                .from('jx3_articles')
                .select('*')
                .or(`id.eq.${id},slug.eq.${id}`)
                .eq('is_hidden', 0)
                .single();

            if (pError) throw pError;

            const { data: comments, error: cError } = await supabase
                .from('jx3_comments')
                .select('*')
                .eq('article_id', post.id)
                .eq('isHidden', 0)
                .order('time', { ascending: true });

            if (cError) throw cError;

            root.innerHTML = Templates.post(post, comments);
            this.setupCommentForm(post.id);
            window.scrollTo(0, 0);
        } catch (e) {
            this.showError(e.message);
        }
    },

    setupCommentForm(articleId) {
        const form = document.getElementById('comment-form');
        if (!form) return;

        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button');
            const nameInput = document.getElementById('comment-name');
            const contentInput = document.getElementById('comment-content');

            const payload = {
                article_id: articleId,
                author_name: nameInput.value || '江湖俠士',
                content: contentInput.value,
                time: this.getCurrentFormattedTime()
            };

            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>傳送中...';

            try {
                const { error } = await supabase.from('jx3_comments').insert([payload]);
                if (error) throw error;
                this.renderPost(articleId); 
            } catch (e) {
                alert('回覆失敗：' + e.message);
            } finally {
                btn.disabled = false;
                btn.innerText = '提交回覆';
            }
        };
    },

    getCurrentFormattedTime() {
        const d = new Date(Date.now() + 8 * 60 * 60 * 1000);
        const p = n => n.toString().padStart(2, '0');
        return `${d.getUTCFullYear()}/${p(d.getUTCMonth()+1)}/${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
    }
};

window.addEventListener('load', () => JX3Blog.init());
