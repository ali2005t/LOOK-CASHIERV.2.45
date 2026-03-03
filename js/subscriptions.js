import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Notify html/daily_closing.html about updates
async function notifyDailyClosing() {
  const event = new CustomEvent('subscriptionsUpdated');
  window.dispatchEvent(event);
}

// Call notifyDailyClosing after adding or updating subscriptions
async function addSubscription(data) {
  await addDoc(collection(db, 'subscriptions'), data);
  notifyDailyClosing();
}

async function updateSubscription(id, data) {
  await updateDoc(doc(db, 'subscriptions', id), data);
  notifyDailyClosing();
}

// إضافة اشتراك جديد
document.getElementById("add-subscription-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value;
  const type = document.getElementById("type").value;
  const grade = document.getElementById("grade").value;
  const price = parseFloat(document.getElementById("price").value);
  const stock = parseInt(document.getElementById("stock").value) || 0;
  const linkedSub = document.getElementById("linked-subscription")?.value || "";

  if (!name || !type || !grade || !price) {
    window.showNotification('يرجى ملء كل الحقول الأساسية', 'error');
    return;
  }

  const subData = {
    name,
    type,
    grade,
    price,
    stock
  };
  // إذا كان نوع الاشتراك "ملزمة فردية" وبه اشتراك مرتبط، أضفه
  if (type === "ملازم فردية" && linkedSub) {
    subData.linkedSubscription = linkedSub;
  }
  await addDoc(collection(db, "subscriptions"), subData);

  window.showNotification('تمت الإضافة بنجاح', 'success');
  loadSubscriptions();
});

// تحميل الاشتراكات
async function loadSubscriptions() {
  const tbody = document.getElementById("subscriptions-table-body");
  tbody.innerHTML = "";
  const snapshot = await getDocs(collection(db, "subscriptions"));
  let rows = [];
  snapshot.forEach((docSnap) => {
    const sub = docSnap.data();
    const tr = document.createElement("tr");
    tr.setAttribute('data-id', docSnap.id);
    tr.innerHTML = `
      <td class="drag-handle" title="اسحب لترتيب الصف">☰</td>
      <td>${sub.name}</td>
      <td>${sub.type}</td>
      <td>${sub.grade}</td>
      <td>${sub.price} ج</td>
      <td>${sub.stock || 0}</td>
      <td>
        <label class="toggle-switch">
          <input type="checkbox" class="toggle-publish-checkbox" data-id="${docSnap.id}" ${sub.published ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </td>
        <td><button onclick="editSubscription('${docSnap.id}')" style="background:#1976d2;color:#fff;border:none;border-radius:6px;padding:4px 14px;font-weight:bold;cursor:pointer;">تعديل</button></td>
        <td><button onclick="deleteSubscription('${docSnap.id}')" style="background:#e53935;color:#fff;border:none;border-radius:6px;padding:4px 14px;font-weight:bold;cursor:pointer;">حذف</button></td>
    `;
    rows.push(tr);
  });
  rows.forEach(tr => tbody.appendChild(tr));
  // إضافة حدث Toggle النشر/الإخفاء
  tbody.querySelectorAll('.toggle-publish-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', async function () {
      const id = checkbox.getAttribute('data-id');
      const tr = checkbox.closest('tr');
      checkbox.disabled = true;
      try {
        const docRef = doc(db, "subscriptions", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const isNowPublished = checkbox.checked;
          await updateDoc(docRef, { published: isNowPublished });
          window.showNotification(`تم ${isNowPublished ? 'نشر ✓' : 'إخفاء ✗'} الاشتراك بنجاح`, 'success');
          loadSubscriptions();
        }
      } catch (e) {
        checkbox.checked = !checkbox.checked; // عكس الحالة عند الخطأ
        window.showNotification('حدث خطأ أثناء تغيير الحالة: ' + (e.message || e), 'error');
      }
      checkbox.disabled = false;
    });
  });
  // تفعيل السحب والإفلات
  if (window.Sortable) {
    // إذا كان هناك Sortable سابق، دمره أولاً
    if (tbody._sortableInstance) {
      tbody._sortableInstance.destroy();
    }
    setTimeout(() => {
      tbody._sortableInstance = new window.Sortable(tbody, {
        handle: '.drag-handle',
        animation: 150,
        direction: 'vertical',
        forceFallback: true, // إصلاح مشاكل السحب في بعض المتصفحات
        fallbackOnBody: true,
        swapThreshold: 0.65,
        scroll: true,
        scrollSensitivity: 60,
        scrollSpeed: 20,
        onStart: function (evt) {
          document.body.style.userSelect = 'none';
        },
        onEnd: function (evt) {
          document.body.style.userSelect = '';
          const ids = Array.from(tbody.querySelectorAll('tr')).map(tr => tr.getAttribute('data-id'));
          localStorage.setItem('subscriptionsOrder', JSON.stringify(ids));
          window.showNotification('تم تغيير ترتيب الصفوف (محلياً فقط)', 'info');
        }
      });
    }, 0);
  }
}

// تحسين منطق التعديل ليظهر نافذة منبثقة لتعديل الاشتراك
window.editSubscription = async (id) => {
  const snapshot = await getDocs(collection(db, "subscriptions"));
  let subDoc;
  snapshot.forEach(docSnap => {
    if (docSnap.id === id) subDoc = docSnap;
  });
  if (!subDoc) return alert("لم يتم العثور على الاشتراك!");
  const sub = subDoc.data();
  // نافذة منبثقة بسيطة
  const modal = document.createElement('div');
  modal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0002;z-index:3000;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `
    <div style="background:#fff;padding:28px 22px;border-radius:12px;min-width:320px;max-width:90vw;box-shadow:0 4px 32px #90caf988;">
      <h3 style='margin-bottom:18px;'>تعديل الاشتراك</h3>
      <input id='edit-name' value='${sub.name}' style='width:100%;margin-bottom:10px;padding:8px;border-radius:6px;border:1px solid #cde4ff;'>
      <input id='edit-type' value='${sub.type}' style='width:100%;margin-bottom:10px;padding:8px;border-radius:6px;border:1px solid #cde4ff;'>
      <input id='edit-grade' value='${sub.grade}' style='width:100%;margin-bottom:10px;padding:8px;border-radius:6px;border:1px solid #cde4ff;'>
      <input id='edit-price' type='number' value='${sub.price}' style='width:100%;margin-bottom:10px;padding:8px;border-radius:6px;border:1px solid #cde4ff;'>
      <input id='edit-stock' type='number' value='${sub.stock || 0}' placeholder='المخزون' style='width:100%;margin-bottom:10px;padding:8px;border-radius:6px;border:1px solid #cde4ff;'>
      <div style='display:flex;gap:10px;justify-content:flex-end;'>
        <button id='save-edit-sub' style='background:#1976d2;color:#fff;padding:8px 22px;border:none;border-radius:7px;cursor:pointer;'>حفظ</button>
        <button id='cancel-edit-sub' style='background:#eee;color:#333;padding:8px 22px;border:none;border-radius:7px;cursor:pointer;'>إلغاء</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('cancel-edit-sub').onclick = () => modal.remove();
  document.getElementById('save-edit-sub').onclick = async () => {
    const newName = document.getElementById('edit-name').value;
    const newType = document.getElementById('edit-type').value;
    const newGrade = document.getElementById('edit-grade').value;
    const newPrice = parseFloat(document.getElementById('edit-price').value);
    const newStock = parseInt(document.getElementById('edit-stock').value) || 0;
    if (!newName || !newType || !newGrade || !newPrice) {
      window.showNotification('يرجى ملء كل الحقول', 'error');
      return;
    }
    await updateDoc(doc(db, 'subscriptions', id), {
      name: newName,
      type: newType,
      grade: newGrade,
      price: newPrice,
      stock: newStock
    });
    modal.remove();
    window.showNotification('تم حفظ التعديلات بنجاح', 'success');
    loadSubscriptions();
  };
};

window.deleteSubscription = async (id) => {
  if (!id) return window.showNotification('لم يتم تحديد الاشتراك للحذف', 'error');
  // إشعار تأكيد قبل الحذف
  const confirmModal = document.createElement('div');
  confirmModal.style = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0003;z-index:4000;display:flex;align-items:center;justify-content:center;';
  confirmModal.innerHTML = `
    <div style="background:#fff;padding:30px 24px;border-radius:14px;min-width:320px;max-width:90vw;box-shadow:0 4px 32px #90caf988;text-align:center;">
      <div style="font-size:1.2em;font-weight:bold;margin-bottom:18px;color:#e53935;">تأكيد حذف الاشتراك</div>
      <div style="margin-bottom:22px;">هل أنت متأكد أنك تريد حذف هذا الاشتراك نهائيًا؟</div>
      <div style="display:flex;gap:16px;justify-content:center;">
        <button id="confirm-delete-sub" style="background:#e53935;color:#fff;padding:8px 28px;border:none;border-radius:8px;font-size:1em;font-weight:bold;cursor:pointer;">حذف</button>
        <button id="cancel-delete-sub" style="background:#eee;color:#333;padding:8px 28px;border:none;border-radius:8px;font-size:1em;cursor:pointer;">إلغاء</button>
      </div>
    </div>
  `;
  document.body.appendChild(confirmModal);
  document.getElementById('cancel-delete-sub').onclick = () => confirmModal.remove();
  document.getElementById('confirm-delete-sub').onclick = async () => {
    try {
      await deleteDoc(doc(db, "subscriptions", id));
      window.showNotification('<span style="font-size:1.15em;font-weight:bold;">تم حذف الاشتراك بنجاح</span>', 'success', 2500);
      loadSubscriptions();
    } catch (e) {
      window.showNotification('<span style="font-size:1.15em;font-weight:bold;">حدث خطأ أثناء الحذف: ' + (e.message || e) + '</span>', 'error', 3500);
    }
    confirmModal.remove();
  };
};

// عند تحميل الصفحة، إذا كان هناك ترتيب محفوظ في localStorage، طبقه
window.addEventListener('DOMContentLoaded', () => {
  const order = localStorage.getItem('subscriptionsOrder');
  if (order) {
    const ids = JSON.parse(order);
    const tbody = document.getElementById('subscriptions-table-body');
    if (tbody && ids && ids.length) {
      // إعادة ترتيب الصفوف حسب ids
      const trs = Array.from(tbody.querySelectorAll('tr'));
      ids.forEach(id => {
        const tr = trs.find(tr => tr.getAttribute('data-id') === id);
        if (tr) tbody.appendChild(tr);
      });
    }
  }
});

loadSubscriptions();

