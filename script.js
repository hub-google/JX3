// JX3 Blog Logic - GitHub Pages (Static) Version

// --- 配置區 ---
// 請在這裡填入您的 Supabase 資訊 (可在 Project Settings -> API 找到)
const SUPABASE_URL = 'https://fanffwnhkxpfhttylntw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fsrieSLUXlq-_WDpPY9K_w_eO-dN_jT'; 

// 初始化 Supabase 客戶端
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const JX3Blog = {
    async init() {
        if (!supabase) {
            console.error("Supabase SDK 載入失敗");
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

    async renderHome() {
        const root = document.getElementById('root');
        if (!root) return;
        
        root.innerHTML = '<div class="flex justify-center py-20"><i class="fa-solid fa-spinner fa-spin text-4xl text-amber-500"></i></div>';

        try {
            const { data: articles, error } = await supabase
                .from('JX3_Articles')
                .select('id, title, slug, summary, author, created_at')
                .eq('is_hidden', 0)
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            if (articles.length === 0) {
                root.innerHTML = '<p class="text-center text-slate-500 py-20">目前還沒有文章，請透過管理後台發布第一篇！</p>';
                return;
            }

            root.innerHTML = Templates.home(articles);
        } catch (e) {
            root.innerHTML = `<p class="text-center text-red-500 py-20">載入失敗：${e.message}<br><small>提示：請檢查 Anon Key 是否正確填寫，並在 Supabase 開啟 RLS 政策。</small></p>`;
        }
    },

    async renderPost(id) {
        const root = document.getElementById('root');
        if (!root) return;

        root.innerHTML = '<div class="flex justify-center py-20"><i class="fa-solid fa-spinner fa-spin text-4xl text-amber-500"></i></div>';

        try {
            // Fetch Post
            const { data: post, error: pError } = await supabase
                .from('JX3_Articles')
                .select('*')
                .or(`id.eq.${id},slug.eq.${id}`)
                .eq('is_hidden', 0)
                .single();

            if (pError) throw pError;

            // Fetch Comments
            const { data: comments, error: cError } = await supabase
                .from('JX3_Comments')
                .select('*')
                .eq('article_id', post.id)
                .eq('isHidden', 0)
                .order('time', { ascending: true });

            if (cError) throw cError;

            root.innerHTML = Templates.post(post, comments);
            this.setupCommentForm(post.id);
        } catch (e) {
            root.innerHTML = `<div class="max-w-2xl mx-auto py-20 text-center"><h2 class="text-2xl font-bold mb-4">404 NOT FOUND</h2><p class="text-slate-400 mb-8">${e.message}</p><a href="/" class="text-amber-500 underline">返回首頁</a></div>`;
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
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>發布中...';

            try {
                const { error } = await supabase.from('JX3_Comments').insert([payload]);
                if (error) throw error;
                this.renderPost(articleId); 
            } catch (e) {
                alert('發布失敗：' + e.message);
            } finally {
                btn.disabled = false;
                btn.innerText = '提交留言';
            }
        };
    },

    getCurrentFormattedTime() {
        const d = new Date(Date.now() + 8 * 60 * 60 * 1000);
        const p = n => n.toString().padStart(2, '0');
        return `${d.getUTCFullYear()}/${p(d.getUTCMonth()+1)}/${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
    }
};

window.onload = () => JX3Blog.init();
