// JX3 Blog - Firebase Firestore Comments

const Comments = {
    currentArticleId: null,
    unsubscribe: null,
    ipInfoPromise: null,

    init(articleId) {
        this.currentArticleId = articleId;
        this.getIpInfo(); // Trigger fetching IP info early
        this.listenForComments();
    },

    getIpInfo() {
        if (this.ipInfoPromise) return this.ipInfoPromise;

        this.ipInfoPromise = (async () => {
            // Try freeipapi.com first
            try {
                const res = await fetch('https://freeipapi.com/api/json');
                if (res.ok) {
                    const data = await res.json();
                    return {
                        ip: data.ipAddress || '',
                        location: data.cityName || data.regionName || data.countryName || ''
                    };
                }
            } catch (e) {
                console.warn("Failed to fetch from freeipapi, trying fallback...", e);
            }

            // Try ipwho.is as fallback
            try {
                const res = await fetch('https://ipwho.is/');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        return {
                            ip: data.ip || '',
                            location: data.city || data.region || data.country || ''
                        };
                    }
                }
            } catch (e) {
                console.warn("Failed to fetch from ipwho.is", e);
            }

            return { ip: '', location: '' };
        })();

        return this.ipInfoPromise;
    },

    listenForComments() {
        if (!this.currentArticleId) return;

        const db = firebase.firestore();
        const container = document.getElementById('comments-container');
        
        // Unsubscribe from previous listener if exists
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        // Setup the UI structure
        if (container) {
            let html = '<div id="comment-form-container"></div><div id="comment-list-container"></div>';
            container.innerHTML = html;
            this.updateFormUI();
        }

        const listContainer = document.getElementById('comment-list-container');
        if (!listContainer) return;

        listContainer.innerHTML = '<div class="text-slate-400 text-sm py-4 text-center">载入留言中...</div>';

        // Listen to Firestore
        this.unsubscribe = db.collection('comments')
            .where('articleId', '==', this.currentArticleId)
            .onSnapshot((snapshot) => {
                const comments = [];
                snapshot.forEach((doc) => {
                    comments.push({ id: doc.id, ...doc.data() });
                });
                
                // Sort locally by timestamp to avoid Firestore composite index requirement
                comments.sort((a, b) => {
                    const timeA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp).getTime()) : 0;
                    const timeB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp).getTime()) : 0;
                    return timeA - timeB;
                });
                
                this.renderComments(comments);
            }, (error) => {
                console.error("Error fetching comments: ", error);
                // Provide a more detailed error message
                if (error.code === 'permission-denied') {
                    listContainer.innerHTML = '<div class="text-red-400 text-sm py-4 text-center border border-slate-800 border-dashed rounded-lg">Firebase 資料庫讀取權限不足，請至控制台修改 Rules。</div>';
                } else {
                    listContainer.innerHTML = '<div class="text-red-400 text-sm py-4 text-center border border-slate-800 border-dashed rounded-lg">Firebase 發生錯誤：' + error.message + '</div>';
                }
            });
    },

    renderComments(comments) {
        const listContainer = document.getElementById('comment-list-container');
        if (!listContainer) return;

        if (comments.length === 0) {
            listContainer.innerHTML = '<div class="text-slate-500 text-sm py-8 text-center border border-slate-800 border-dashed rounded-lg">暂无留言，抢先头香吧！</div>';
            return;
        }

        // Build the nested tree
        const topLevelComments = [];
        const commentMap = {};

        // 1. Map all comments
        comments.forEach(c => {
            commentMap[c.id] = {
                ...c,
                replies: [],
                floorPath: ''
            };
        });

        // 2. Build relationships
        comments.forEach(c => {
            const mapped = commentMap[c.id];
            if (!c.parentId) {
                topLevelComments.push(mapped);
                mapped.floorPath = String(topLevelComments.length);
            } else {
                const parent = commentMap[c.parentId];
                if (parent) {
                    parent.replies.push(mapped);
                } else {
                    // Fallback to top-level if parent is missing
                    topLevelComments.push(mapped);
                    mapped.floorPath = String(topLevelComments.length);
                }
            }
        });

        // 3. Assign floorPaths recursively to replies
        const assignFloorPaths = (comment, parentPath) => {
            comment.replies.forEach((reply, idx) => {
                reply.floorPath = `${parentPath}-${idx + 1}`;
                assignFloorPaths(reply, reply.floorPath);
            });
        };

        topLevelComments.forEach(c => {
            assignFloorPaths(c, c.floorPath);
        });

        // 4. Flatten the tree for rendering in depth-first order
        const flatRenderedList = [];
        const traverse = (comment, depth) => {
            flatRenderedList.push({ comment, depth });
            comment.replies.forEach(r => traverse(r, depth + 1));
        };

        topLevelComments.forEach(c => traverse(c, 0));

        // 5. Generate HTML
        let html = '<div class="mt-4">';
        flatRenderedList.forEach(({ comment, depth }) => {
            const timeStr = comment.timestamp && comment.timestamp.toDate ? comment.timestamp.toDate().toISOString() : comment.timestamp;
            const commentData = {
                ...comment,
                timestamp: timeStr || new Date().toISOString()
            };
            html += Templates.commentItem(commentData, depth);
        });
        html += '</div>';

        listContainer.innerHTML = html;
    },

    isAdmin() {
        const adminEmails = (window.JX3_DATA && window.JX3_DATA.adminEmails) || ["cyt18@gmail.com", "cyt18.tw@gmail.com"];
        return Auth.currentUser && adminEmails.includes(Auth.currentUser.email);
    },

    showReplyForm(parentId) {
        if (!Auth.currentUser) {
            Auth.openLoginModal();
            return;
        }

        const container = document.getElementById(`reply-form-${parentId}`);
        if (!container) return;

        if (container.classList.contains('hidden')) {
            container.classList.remove('hidden');
            const showAdminCheckbox = this.isAdmin();
            container.innerHTML = `
                <form onsubmit="Comments.submitReply(event, '${parentId}')" class="mt-2 bg-slate-900/50 p-4 border border-slate-800 rounded-lg">
                    <textarea id="reply-input-${parentId}" rows="2" class="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded text-sm focus:outline-none focus:border-amber-500 mb-2" placeholder="回覆此留言..." required></textarea>
                    <div class="flex justify-between items-center flex-wrap gap-2">
                        <span class="text-xs text-slate-500">以 <span class="text-amber-500 font-bold">${Auth.currentUser.username}</span> 的身分回覆</span>
                        <div class="flex gap-2 items-center">
                            ${showAdminCheckbox ? `<label class="flex items-center gap-1.5 text-xs text-amber-500 select-none mr-2 font-bold cursor-pointer"><input type="checkbox" id="reply-as-admin-${parentId}" class="accent-amber-500"> 站長回覆</label>` : ''}
                            <button type="button" onclick="Comments.hideReplyForm('${parentId}')" class="text-slate-400 hover:text-white px-3 py-1 text-xs">取消</button>
                            <button type="submit" class="bg-amber-600 text-white px-4 py-1.5 rounded text-xs font-bold hover:bg-amber-500 transition">送出</button>
                        </div>
                    </div>
                </form>
            `;
        } else {
            this.hideReplyForm(parentId);
        }
    },

    hideReplyForm(parentId) {
        const container = document.getElementById(`reply-form-${parentId}`);
        if (container) {
            container.classList.add('hidden');
            container.innerHTML = '';
        }
    },

    async submitReply(e, parentId) {
        e.preventDefault();
        if (!Auth.currentUser) {
            Auth.openLoginModal();
            return;
        }

        const inputEl = document.getElementById(`reply-input-${parentId}`);
        const content = inputEl.value.trim();
        if (!content || !this.currentArticleId) return;

        const asAdminCheckbox = document.getElementById(`reply-as-admin-${parentId}`);
        const asAdmin = asAdminCheckbox ? asAdminCheckbox.checked : false;

        const db = firebase.firestore();

        let ip = '';
        let location = '';
        try {
            const ipInfo = await this.getIpInfo();
            ip = ipInfo.ip;
            location = ipInfo.location;
        } catch (error) {
            console.error("Failed to fetch IP info on submit reply:", error);
        }

        try {
            await db.collection('comments').add({
                articleId: this.currentArticleId,
                parentId: parentId,
                username: Auth.currentUser.username,
                uid: Auth.currentUser.uid,
                content: content,
                isAdminReply: asAdmin,
                ip: ip,
                location: location,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.hideReplyForm(parentId);
        } catch (error) {
            console.error("Error adding reply comment: ", error);
            alert("留言失敗，請稍候重試。");
        }
    },

    updateFormUI() {
        const formContainer = document.getElementById('comment-form-container');
        if (!formContainer) return;

        if (Auth.currentUser) {
            formContainer.innerHTML = Templates.commentForm();
            const usernameDisplay = document.getElementById('comment-username-display');
            if (usernameDisplay) {
                usernameDisplay.textContent = Auth.currentUser.username;
            }
        } else {
            formContainer.innerHTML = Templates.commentLoginPrompt();
        }
    },

    async submitComment(e) {
        e.preventDefault();
        if (!Auth.currentUser) {
            Auth.openLoginModal();
            return;
        }

        const inputEl = document.getElementById('comment-input');
        const content = inputEl.value.trim();
        
        if (!content || !this.currentArticleId) return;

        const asAdminCheckbox = document.getElementById('comment-as-admin');
        const asAdmin = asAdminCheckbox ? asAdminCheckbox.checked : false;

        const db = firebase.firestore();

        let ip = '';
        let location = '';
        try {
            const ipInfo = await this.getIpInfo();
            ip = ipInfo.ip;
            location = ipInfo.location;
        } catch (error) {
            console.error("Failed to fetch IP info on submit comment:", error);
        }
        
        try {
            await db.collection('comments').add({
                articleId: this.currentArticleId,
                parentId: null,
                username: Auth.currentUser.username,
                uid: Auth.currentUser.uid,
                content: content,
                isAdminReply: asAdmin,
                ip: ip,
                location: location,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Clear input after successful submit
            inputEl.value = '';
            
        } catch (error) {
            console.error("Error adding comment: ", error);
            alert("留言失败，请确认 Firebase 設定是否正確，以及 Firestore 讀寫權限是否開放。");
        }
    }
};
