// JX3 Blog Logic - Pure Git Static Version - v1.0.2
console.log("JX3 Blog Engine v1.0.2 Loaded");

const JX3Blog = {
    init() {
        console.log("Initializing JX3 Blog...");
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
        const app = document.getElementById('jx3-app');
        if (app) {
            app.innerHTML = `
                <div class="max-w-2xl mx-auto py-32 text-center px-6">
                    <h2 class="text-2xl font-black mb-4 text-white">發生錯誤 ERROR</h2>
                    <p class="text-slate-400 mb-8 leading-relaxed">${msg}</p>
                    <a href="./" class="inline-block bg-amber-600 text-white px-8 py-3 rounded-full font-bold hover:bg-amber-500 transition">返回首頁 INDEX</a>
                </div>`;
        }
    },

    renderHome() {
        const app = document.getElementById('jx3-app');
        if (!app) {
            console.error("Critical Error: Container 'jx3-app' not found!");
            return;
        }

        const articles = window.JX3_DATA.articles.filter(a => a.is_hidden != 1);
        console.log("Visible articles found:", articles.length);
        
        if (!articles || articles.length === 0) {
            app.innerHTML = '<p class="text-center text-slate-400 py-32">目前還沒有文章 (No articles found)。</p>';
            return;
        }

        app.innerHTML = Templates.home(articles);
        window.scrollTo(0, 0);
    },

    renderPost(id) {
        const app = document.getElementById('jx3-app');
        if (!app) return;

        const post = window.JX3_DATA.articles.find(a => a.id === id || a.slug === id);

        if (!post || post.is_hidden == 1) {
            this.showError("找不到這篇文章，或該內容已移除。");
            return;
        }

        const comments = window.JX3_DATA.comments ? window.JX3_DATA.comments.filter(c => c.article_id === post.id) : [];

        app.innerHTML = Templates.post(post, comments);
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
