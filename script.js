// JX3 Blog Logic - Pure Git Static Version (No Supabase)

const JX3Blog = {
    init() {
        // 從全局對象 data.js 讀取資料
        const data = window.JX3_DATA;
        if (!data) {
            this.showError("資料載入失敗 (data.js 缺失)。");
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
                    <h2 class="text-2xl font-black mb-4 text-slate-900">發生錯誤</h2>
                    <p class="text-slate-500 mb-8 leading-relaxed">${msg}</p>
                    <a href="./" class="inline-block bg-slate-900 text-white px-8 py-3 rounded-full font-bold hover:bg-amber-600 transition">返回目錄</a>
                </div>`;
        }
    },

    renderHome() {
        const root = document.getElementById('root');
        if (!root) return;

        const articles = window.JX3_DATA.articles.filter(a => a.is_hidden === 0);
        
        if (!articles || articles.length === 0) {
            root.innerHTML = '<p class="text-center text-slate-400 py-32">目前還沒有文章。</p>';
            return;
        }

        root.innerHTML = Templates.home(articles);
        window.scrollTo(0, 0);
    },

    renderPost(id) {
        const root = document.getElementById('root');
        if (!root) return;

        const post = window.JX3_DATA.articles.find(a => a.id === id || a.slug === id);

        if (!post || post.is_hidden === 1) {
            this.showError("找不到這篇文章，或該內容已移除。");
            return;
        }

        // 靜態版留言從 data.js 讀取
        const comments = window.JX3_DATA.comments.filter(c => c.article_id === post.id);

        root.innerHTML = Templates.post(post, comments);
        this.setupCommentForm(post.id);
        window.scrollTo(0, 0);
    },

    setupCommentForm(articleId) {
        const form = document.getElementById('comment-form');
        if (!form) return;

        form.onsubmit = (e) => {
            e.preventDefault();
            alert("「純靜態版」目前不支援即時提交留言。若需更新內容，請直接修改 data.js 並推送到 GitHub。\n\n(這能保證您的網頁 100% 穩定且不轉圈)");
        };
    }
};

// 使用立即執行函式確保安全載入
window.addEventListener('load', () => JX3Blog.init());
