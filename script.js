// JX3 Blog Logic - Pure Git Static Version - v1.0.2
console.log("JX3 Blog Engine v1.0.2 Loaded");

const JX3Blog = {
    init() {
        console.log("Initializing JX3 Blog...");
        const data = window.JX3_DATA;
        if (!data) {
            this.showError("资料载入失败 (data.js 缺失)。");
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
                    <h2 class="text-2xl font-black mb-4 text-white">发生错误 ERROR</h2>
                    <p class="text-slate-400 mb-8 leading-relaxed">${msg}</p>
                    <a href="./" class="inline-block bg-amber-600 text-white px-8 py-3 rounded-full font-bold hover:bg-amber-500 transition">返回首页 INDEX</a>
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
            app.innerHTML = '<p class="text-center text-slate-400 py-32">目前还没有文章 (No articles found)。</p>';
            return;
        }

        app.innerHTML = Templates.home(articles);
        window.scrollTo(0, 0);
    },

    async renderPost(id) {
        const app = document.getElementById('jx3-app');
        if (!app) return;

        const post = window.JX3_DATA.articles.find(a => a.id === id || a.slug === id);

        if (!post || post.is_hidden == 1) {
            this.showError("找不到这篇文章，或该内容已移除。");
            return;
        }

        // 先渲染模板框架
        app.innerHTML = Templates.post(post);
        window.scrollTo(0, 0);

        // 非同步讀取文章內容
        try {
            const response = await fetch(`posts/${post.slug || post.id}.html`);
            if (!response.ok) throw new Error("無法讀取內容檔");
            const content = await response.text();
            
            const bodyDiv = document.getElementById('post-body');
            if (bodyDiv) {
                bodyDiv.innerHTML = content;
                // 加入淡入效果
                bodyDiv.classList.add('fade-in');
            }
        } catch (err) {
            console.error(err);
            const bodyDiv = document.getElementById('post-body');
            if (bodyDiv) bodyDiv.innerHTML = `<p class="text-red-400 py-20 text-center">内容加载失败：${err.message}</p>`;
        }
    }
};

// 使用立即執行函式確保安全載入
window.addEventListener('load', () => JX3Blog.init());
