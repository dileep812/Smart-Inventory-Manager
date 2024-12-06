/**
 * Notifications Client-Side Script
 * Handles bell icon dropdown and AJAX notification management
 */

let notificationsLoaded = false;

/**
 * Toggle the notification dropdown
 */
function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    const isOpen = dropdown.classList.contains('active');

    if (isOpen) {
        dropdown.classList.remove('active');
    } else {
        dropdown.classList.add('active');
        if (!notificationsLoaded) {
            fetchNotifications();
        }
    }
}

/**
 * Close dropdown when clicking outside
 */
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('notificationDropdown');
    const btn = document.getElementById('notificationBtn');

    if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

/**
 * Fetch unread notifications from the API
 */
async function fetchNotifications() {
    const listEl = document.getElementById('notificationList');

    try {
        const res = await fetch('/api/notifications/unread');
        const data = await res.json();

        if (data.success && data.notifications) {
            renderNotifications(data.notifications);
            notificationsLoaded = true;
        } else {
            listEl.innerHTML = '<div class="notification-empty"><span>❌</span>Failed to load</div>';
        }
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        listEl.innerHTML = '<div class="notification-empty"><span>❌</span>Error loading</div>';
    }
}

/**
 * Render notifications in the dropdown
 */
function renderNotifications(notifications) {
    const listEl = document.getElementById('notificationList');

    if (!notifications || notifications.length === 0) {
        listEl.innerHTML = `
            <div class="notification-empty">
                <span>🔔</span>
                <p>No new notifications</p>
            </div>
        `;
        return;
    }

    listEl.innerHTML = notifications.map(n => `
        <div class="notification-item unread" data-id="${n.id}" onclick="markNotificationRead(${n.id}, this)">
            <div class="notification-icon ${n.type}">
                ${getNotificationIcon(n.type)}
            </div>
            <div class="notification-content">
                <p class="notification-message">${escapeHtml(n.message)}</p>
                <span class="notification-time">${formatTime(n.created_at)}</span>
            </div>
        </div>
    `).join('');
}

/**
 * Get icon emoji based on notification type
 */
function getNotificationIcon(type) {
    const icons = {
        'alert': '⚠️',
        'warning': '🔶',
        'success': '✅',
        'info': 'ℹ️'
    };
    return icons[type] || '🔔';
}

/**
 * Format timestamp to relative time
 */
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return date.toLocaleDateString();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Mark a single notification as read
 */
async function markNotificationRead(id, element) {
    try {
        await fetch(`/api/notifications/${id}/read`, { method: 'POST' });

        // Remove unread styling
        element.classList.remove('unread');

        // Update badge count
        updateBadgeCount(-1);
    } catch (error) {
        console.error('Failed to mark as read:', error);
    }
}

/**
 * Mark all notifications as read
 */
async function markAllNotificationsRead() {
    try {
        await fetch('/api/notifications/read-all', { method: 'POST' });

        // Remove all unread styling
        document.querySelectorAll('.notification-item.unread').forEach(el => {
            el.classList.remove('unread');
        });

        // Hide badge
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            badge.style.display = 'none';
            badge.textContent = '0';
        }
    } catch (error) {
        console.error('Failed to mark all as read:', error);
    }
}

/**
 * Update the badge count
 */
function updateBadgeCount(delta) {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    let count = parseInt(badge.textContent) || 0;
    count = Math.max(0, count + delta);

    if (count === 0) {
        badge.style.display = 'none';
    } else {
        badge.style.display = '';
        badge.textContent = count > 9 ? '9+' : count;
    }
}
