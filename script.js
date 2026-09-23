/* =========================================================
   SHOP MANAGEMENT SYSTEM
   ========================================================= */

const STORAGE_KEY = "shopManagementSystem";


/* ================= DATA ================= */

let savedData = localStorage.getItem(STORAGE_KEY);

let data = {
    products: [],
    sales: [],
    purchases: []
};

if (savedData) {
    try {
        const parsed = JSON.parse(savedData);

        data.products = Array.isArray(parsed.products)
            ? parsed.products
            : [];

        data.sales = Array.isArray(parsed.sales)
            ? parsed.sales
            : [];

        data.purchases = Array.isArray(parsed.purchases)
            ? parsed.purchases
            : [];

    } catch (error) {
        console.error("Storage error:", error);
    }
}


/*
    الفاتورة الحالية لا تدخل الأرشيف
    إلا بعد الضغط على إتمام البيع.
*/

let currentInvoiceItems = [];


/* ================= HELPERS ================= */

function saveData() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );
}


function money(value) {
    return Number(value || 0).toFixed(2);
}


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function todayString() {

    const now = new Date();

    const year = now.getFullYear();

    const month = String(now.getMonth() + 1)
        .padStart(2, "0");

    const day = String(now.getDate())
        .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function formatDate(dateString) {

    if (!dateString) return "";

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        return dateString;
    }

    return date.toLocaleDateString("ar-EG");
}


/* ================= INVOICE NUMBER ================= */

function generateInvoiceNumber() {

    let maxNumber = 0;

    data.sales.forEach(invoice => {

        const number = String(
            invoice.invoiceNumber || ""
        );

        const match = number.match(/^INV-(\d+)$/i);

        if (match) {
            maxNumber = Math.max(
                maxNumber,
                Number(match[1])
            );
        }
    });

    return `INV-${String(maxNumber + 1).padStart(4, "0")}`;
}


/* ================= NAVIGATION ================= */

const navButtons =
    document.querySelectorAll(".nav-btn");

const sections =
    document.querySelectorAll(".section");

const pageTitle =
    document.getElementById("pageTitle");


const titles = {

    dashboardSection: "الرئيسية",

    salesSection: "المبيعات",

    salesArchiveSection: "أرشيف المبيعات",

    purchasesSection: "المشتريات",

    productsSection: "المنتجات",

    reportsSection: "التقارير"
};


navButtons.forEach(button => {

    button.addEventListener("click", () => {

        const sectionId =
            button.dataset.section;

        navButtons.forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        sections.forEach(section => {
            section.classList.remove("active");
        });

        document
            .getElementById(sectionId)
            .classList.add("active");

        pageTitle.textContent =
            titles[sectionId] || "";

        renderAll();
    });
});


/* ================= DATE ================= */

function updateDate() {

    const element =
        document.getElementById("currentDate");

    if (!element) return;

    element.textContent =
        new Date().toLocaleDateString(
            "ar-EG",
            {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );
}


/* ================= SALES CURRENT INVOICE ================= */

function resetSaleProductFields() {

    document.getElementById("saleProductCode").value = "";

    document.getElementById("saleProductName").value = "";

    document.getElementById("saleProductPrice").value = "";

    document.getElementById("saleProductQuantity").value = 1;
}


function setupNewInvoice() {

    document.getElementById("saleInvoiceNumber").value =
        generateInvoiceNumber();

    document.getElementById("saleCustomerName").value = "";

    document.getElementById("saleDate").value =
        formatDate(todayString());

    document.getElementById("salePaid").value = 0;

    currentInvoiceItems = [];

    resetSaleProductFields();

    renderCurrentInvoice();
}


/* ================= PRODUCT LOOKUP ================= */

document
    .getElementById("saleProductCode")
    .addEventListener("input", function () {

        const code =
            this.value.trim();

        const product =
            data.products.find(
                p =>
                    String(p.code).toLowerCase() ===
                    code.toLowerCase()
            );

        const nameInput =
            document.getElementById(
                "saleProductName"
            );

        const priceInput =
            document.getElementById(
                "saleProductPrice"
            );

        if (product) {

            nameInput.value =
                product.name;

            priceInput.value =
                product.sellingPrice;

        } else {

            nameInput.value = "";

            priceInput.value = "";
        }
    });


/* ================= ADD TO INVOICE ================= */

document
    .getElementById("addToInvoiceBtn")
    .addEventListener("click", addToInvoice);


function addToInvoice() {

    const code =
        document
            .getElementById("saleProductCode")
            .value
            .trim();

    const quantity =
        Number(
            document
                .getElementById("saleProductQuantity")
                .value
        );

    const price =
        Number(
            document
                .getElementById("saleProductPrice")
                .value
        );

    if (!code) {
        alert("من فضلك أدخل كود المنتج.");
        return;
    }

    const product =
        data.products.find(
            p =>
                String(p.code).toLowerCase() ===
                code.toLowerCase()
        );

    if (!product) {
        alert("المنتج غير موجود في المنتجات.");
        return;
    }

    if (!quantity || quantity <= 0) {
        alert("أدخل كمية صحيحة.");
        return;
    }

    if (price < 0 || isNaN(price)) {
        alert("أدخل سعر بيع صحيح.");
        return;
    }


    /* معرفة الكمية الموجودة بالفعل في الفاتورة */

    const existing =
        currentInvoiceItems.find(
            item =>
                String(item.code).toLowerCase() ===
                code.toLowerCase()
        );

    const alreadyAdded =
        existing
            ? existing.quantity
            : 0;

    const totalRequested =
        alreadyAdded + quantity;


    /* لا نسمح بتجاوز المخزون */

    if (totalRequested > Number(product.quantity)) {

        alert(
            `الكمية المطلوبة أكبر من المخزون.\nالمتاح: ${product.quantity}`
        );

        return;
    }


    const costPrice =
        Number(product.purchasePrice || 0);


    if (existing) {

        existing.quantity =
            totalRequested;

        existing.price =
            price;

        existing.total =
            existing.quantity *
            existing.price;

        existing.profit =
            existing.quantity *
            (existing.price - costPrice);

    } else {

        currentInvoiceItems.push({

            code: product.code,

            name: product.name,

            quantity: quantity,

            price: price,

            costPrice: costPrice,

            total: quantity * price,

            profit:
                quantity *
                (price - costPrice)
        });
    }


    resetSaleProductFields();

    renderCurrentInvoice();
}


/* ================= RENDER CURRENT INVOICE ================= */

function renderCurrentInvoice() {

    const body =
        document.getElementById(
            "currentInvoiceBody"
        );

    const empty =
        document.getElementById(
            "emptyInvoice"
        );

    const count =
        document.getElementById(
            "currentItemsCount"
        );


    body.innerHTML = "";


    if (currentInvoiceItems.length === 0) {

        empty.style.display = "block";

        count.textContent = "0 منتجات";

    } else {

        empty.style.display = "none";

        count.textContent =
            `${currentInvoiceItems.length} منتجات`;


        currentInvoiceItems.forEach(
            (item, index) => {

                const row =
                    document.createElement("tr");

                row.innerHTML = `

                    <td>${index + 1}</td>

                    <td>
                        ${escapeHtml(item.code)}
                    </td>

                    <td>
                        ${escapeHtml(item.name)}
                    </td>

                    <td>
                        ${item.quantity}
                    </td>

                    <td>
                        ${money(item.price)}
                    </td>

                    <td>
                        ${money(item.total)}
                    </td>

                    <td>
                        ${money(item.profit)}
                    </td>

                    <td>

                        <button
                            class="delete-item"
                            onclick="removeCurrentItem(${index})"
                        >
                            حذف
                        </button>

                    </td>
                `;

                body.appendChild(row);
            }
        );
    }


    updateInvoiceTotals();
}


/* ================= REMOVE CURRENT ITEM ================= */

function removeCurrentItem(index) {

    currentInvoiceItems.splice(index, 1);

    renderCurrentInvoice();
}


/* ================= TOTALS ================= */

function getCurrentTotal() {

    return currentInvoiceItems.reduce(
        (sum, item) =>
            sum + Number(item.total || 0),
        0
    );
}


function getCurrentProfit() {

    return currentInvoiceItems.reduce(
        (sum, item) =>
            sum + Number(item.profit || 0),
        0
    );
}


function updateInvoiceTotals() {

    const total =
        getCurrentTotal();

    const profit =
        getCurrentProfit();

    const paid =
        Number(
            document
                .getElementById("salePaid")
                .value
        ) || 0;

    const remaining =
        Math.max(0, total - paid);


    document
        .getElementById("currentInvoiceTotal")
        .textContent =
        `${money(total)} جنيه`;


    document
        .getElementById("currentInvoiceProfit")
        .textContent =
        `${money(profit)} جنيه`;


    document
        .getElementById("currentInvoiceRemaining")
        .textContent =
        `${money(remaining)} جنيه`;
}


document
    .getElementById("salePaid")
    .addEventListener(
        "input",
        updateInvoiceTotals
    );


/* ================= CLEAR INVOICE ================= */

document
    .getElementById("clearInvoiceBtn")
    .addEventListener(
        "click",
        clearCurrentInvoice
    );


function clearCurrentInvoice() {

    if (currentInvoiceItems.length > 0) {

        const confirmed =
            confirm(
                "هل تريد مسح الفاتورة الحالية؟"
            );

        if (!confirmed) return;
    }

    setupNewInvoice();
}


/* ================= FINISH SALE ================= */

document
    .getElementById("finishSaleBtn")
    .addEventListener(
        "click",
        finishSale
    );


function finishSale() {

    if (currentInvoiceItems.length === 0) {

        alert(
            "لا يمكن إتمام البيع بدون منتجات."
        );

        return;
    }


    const invoiceNumber =
        document
            .getElementById("saleInvoiceNumber")
            .value;

    const customer =
        document
            .getElementById("saleCustomerName")
            .value
            .trim() || "عميل نقدي";


    const paid =
        Number(
            document
                .getElementById("salePaid")
                .value
        ) || 0;


    const total =
        getCurrentTotal();

    const profit =
        getCurrentProfit();


    if (paid < 0) {

        alert("المدفوع لا يمكن أن يكون بالسالب.");

        return;
    }


    if (paid > total) {

        alert(
            "المبلغ المدفوع أكبر من إجمالي الفاتورة."
        );

        return;
    }


    /* فحص المخزون مرة أخرى قبل الحفظ */

    for (const item of currentInvoiceItems) {

        const product =
            data.products.find(
                p =>
                    String(p.code).toLowerCase() ===
                    String(item.code).toLowerCase()
            );

        if (!product) {

            alert(
                `المنتج ${item.name} لم يعد موجودًا.`
            );

            return;
        }

        if (
            Number(product.quantity) <
            Number(item.quantity)
        ) {

            alert(
                `المخزون غير كافٍ للمنتج: ${item.name}`
            );

            return;
        }
    }


    /* خصم الكميات من المخزون */

    currentInvoiceItems.forEach(item => {

        const product =
            data.products.find(
                p =>
                    String(p.code).toLowerCase() ===
                    String(item.code).toLowerCase()
            );

        product.quantity =
            Number(product.quantity) -
            Number(item.quantity);
    });


    const remaining =
        total - paid;


    /* إنشاء الفاتورة الكاملة */

    const invoice = {

        invoiceNumber: invoiceNumber,

        customerName: customer,

        date: todayString(),

        items: currentInvoiceItems.map(
            item => ({
                code: item.code,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                costPrice: item.costPrice,
                total: item.total,
                profit: item.profit
            })
        ),

        total: total,

        paid: paid,

        remaining: remaining,

        profit: profit
    };


    /* حفظ الفاتورة كسجل واحد */

    data.sales.push(invoice);

    saveData();


    alert(
        `تم إتمام البيع بنجاح.\nرقم الفاتورة: ${invoiceNumber}`
    );


    /* بدء فاتورة جديدة */

    setupNewInvoice();

    renderAll();
}


/* ================= PRINT CURRENT INVOICE ================= */

document
    .getElementById("printCurrentInvoiceBtn")
    .addEventListener(
        "click",
        printCurrentInvoice
    );


function printCurrentInvoice() {

    if (currentInvoiceItems.length === 0) {

        alert(
            "لا توجد منتجات في الفاتورة."
        );

        return;
    }


    const invoice = {

        invoiceNumber:
            document
                .getElementById(
                    "saleInvoiceNumber"
                )
                .value,

        customerName:
            document
                .getElementById(
                    "saleCustomerName"
                )
                .value
                .trim() || "عميل نقدي",

        date: todayString(),

        items: currentInvoiceItems,

        total: getCurrentTotal(),

        paid:
            Number(
                document
                    .getElementById(
                        "salePaid"
                    )
                    .value
            ) || 0,

        remaining:
            getCurrentTotal() -
            (
                Number(
                    document
                        .getElementById(
                            "salePaid"
                        )
                        .value
                ) || 0
            ),

        profit: getCurrentProfit()
    };


    printInvoice(invoice);
}


/* ================= PRINT ARCHIVE INVOICE ================= */

function printArchivedInvoice(index) {

    const invoice =
        data.sales[index];

    if (!invoice) return;

    printInvoice(invoice);
}


/* ================= PRINT FUNCTION ================= */

function printInvoice(invoice) {

    const printWindow =
        window.open(
            "",
            "_blank",
            "width=900,height=700"
        );


    if (!printWindow) {

        alert(
            "المتصفح منع نافذة الطباعة. اسمح بالنوافذ المنبثقة."
        );

        return;
    }


    let rows = "";

    invoice.items.forEach(
        (item, index) => {

            rows += `

                <tr>

                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        ${escapeHtml(item.name)}
                    </td>

                    <td>
                        ${escapeHtml(item.code)}
                    </td>

                    <td>
                        ${item.quantity}
                    </td>

                    <td>
                        ${money(item.price)}
                    </td>

                    <td>
                        ${money(item.total)}
                    </td>

                </tr>

            `;
        }
    );


    const html = `

        <!DOCTYPE html>

        <html lang="ar" dir="rtl">

        <head>

            <meta charset="UTF-8">

            <title>
                فاتورة ${escapeHtml(invoice.invoiceNumber)}
            </title>

            <style>

                body {
                    font-family: Arial, Tahoma, sans-serif;
                    padding: 35px;
                    color: #111;
                }

                .invoice {
                    max-width: 850px;
                    margin: auto;
                }

                .header {
                    text-align: center;
                    margin-bottom: 25px;
                }

                .header h1 {
                    margin-bottom: 5px;
                }

                .header p {
                    margin: 4px;
                }

                .info {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                    margin-bottom: 25px;
                    border: 1px solid #ddd;
                    padding: 15px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                }

                th,
                td {
                    border: 1px solid #ccc;
                    padding: 10px;
                    text-align: center;
                }

                th {
                    background: #f3f3f3;
                }

                .summary {
                    margin-top: 25px;
                    width: 350px;
                    margin-right: auto;
                }

                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px;
                    border-bottom: 1px solid #ddd;
                }

                .footer {
                    text-align: center;
                    margin-top: 40px;
                }

                @media print {

                    body {
                        padding: 0;
                    }

                    button {
                        display: none;
                    }
                }

            </style>

        </head>


        <body>

            <div class="invoice">

                <div class="header">

                    <h1>المحل</h1>

                    <p>
                        إدارة: الأستاذ / أحمد عاطف بدران
                    </p>

                    <h2>
                        فاتورة مبيعات
                    </h2>

                </div>


                <div class="info">

                    <div>
                        <strong>رقم الفاتورة:</strong>
                        ${escapeHtml(invoice.invoiceNumber)}
                    </div>

                    <div>
                        <strong>التاريخ:</strong>
                        ${formatDate(invoice.date)}
                    </div>

                    <div>
                        <strong>العميل:</strong>
                        ${escapeHtml(invoice.customerName)}
                    </div>

                </div>


                <table>

                    <thead>

                        <tr>
                            <th>#</th>
                            <th>المنتج</th>
                            <th>الكود</th>
                            <th>الكمية</th>
                            <th>السعر</th>
                            <th>الإجمالي</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${rows}

                    </tbody>

                </table>


                <div class="summary">

                    <div class="summary-row">

                        <strong>
                            إجمالي الفاتورة
                        </strong>

                        <strong>
                            ${money(invoice.total)} جنيه
                        </strong>

                    </div>


                    <div class="summary-row">

                        <strong>
                            المدفوع
                        </strong>

                        <strong>
                            ${money(invoice.paid)} جنيه
                        </strong>

                    </div>


                    <div class="summary-row">

                        <strong>
                            المتبقي
                        </strong>

                        <strong>
                            ${money(invoice.remaining)} جنيه
                        </strong>

                    </div>

                </div>


                <div class="footer">

                    <p>
                        شكرًا لتعاملكم معنا
                    </p>

                </div>

            </div>


            <script>

                window.onload = function() {

                    window.print();

                };

            <\/script>

        </body>

        </html>

    `;


    printWindow.document.open();

    printWindow.document.write(html);

    printWindow.document.close();
}


/* ================= ARCHIVE ================= */

function renderSalesArchive() {

    const body =
        document.getElementById(
            "salesArchiveBody"
        );

    const search =
        (
            document
                .getElementById(
                    "archiveSearch"
                )
                .value || ""
        )
        .trim()
        .toLowerCase();


    const dateSearch =
        document
            .getElementById(
                "archiveDateSearch"
            )
            .value;


    body.innerHTML = "";


    const filtered =
        data.sales.filter(
            invoice => {

                const invoiceNumber =
                    String(
                        invoice.invoiceNumber || ""
                    ).toLowerCase();

                const customer =
                    String(
                        invoice.customerName || ""
                    ).toLowerCase();

                const matchesSearch =
                    !search ||
                    invoiceNumber.includes(search) ||
                    customer.includes(search);

                const matchesDate =
                    !dateSearch ||
                    invoice.date === dateSearch;

                return (
                    matchesSearch &&
                    matchesDate
                );
            }
        );


    if (filtered.length === 0) {

        body.innerHTML = `

            <tr>

                <td colspan="10">
                    لا توجد فواتير في الأرشيف.
                </td>

            </tr>

        `;

        return;
    }


    /*
        نحتاج index الحقيقي داخل data.sales
        لأن filtered قد يكون ترتيبها مختلف.
    */

    filtered.forEach(invoice => {

        const realIndex =
            data.sales.indexOf(invoice);


        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                <strong>
                    ${escapeHtml(invoice.invoiceNumber)}
                </strong>
            </td>

            <td>
                ${escapeHtml(invoice.customerName)}
            </td>

            <td>
                ${formatDate(invoice.date)}
            </td>

            <td>
                ${invoice.items.length}
            </td>

            <td>
                ${money(invoice.total)}
            </td>

            <td>
                ${money(invoice.paid)}
            </td>

            <td>
                ${money(invoice.remaining)}
            </td>

            <td>
                ${money(invoice.profit)}
            </td>

            <td>

                <button
                    class="print-btn"
                    onclick="printArchivedInvoice(${realIndex})"
                >
                    🖨️
                </button>

            </td>

            <td>

                <button
                    class="delete-item"
                    onclick="deleteArchivedInvoice(${realIndex})"
                >
                    حذف
                </button>

            </td>

        `;


        body.appendChild(row);
    });
}


/* ================= DELETE ARCHIVED INVOICE ================= */

function deleteArchivedInvoice(index) {

    const invoice =
        data.sales[index];

    if (!invoice) return;


    const confirmed =
        confirm(
            `هل تريد حذف الفاتورة ${invoice.invoiceNumber}؟\nسيتم إعادة الكميات إلى المخزون.`
        );


    if (!confirmed) return;


    /*
        إعادة المنتجات للمخزون
    */

    invoice.items.forEach(item => {

        const product =
            data.products.find(
                p =>
                    String(p.code).toLowerCase() ===
                    String(item.code).toLowerCase()
            );

        if (product) {

            product.quantity =
                Number(product.quantity) +
                Number(item.quantity);
        }
    });


    data.sales.splice(index, 1);

    saveData();

    renderAll();

    alert("تم حذف الفاتورة وإعادة الكميات للمخزون.");
}


/* ================= ARCHIVE SEARCH ================= */

document
    .getElementById("archiveSearch")
    .addEventListener(
        "input",
        renderSalesArchive
    );


document
    .getElementById("archiveDateSearch")
    .addEventListener(
        "change",
        renderSalesArchive
    );


/* ================= PRODUCTS ================= */

document
    .getElementById("addProductBtn")
    .addEventListener(
        "click",
        addProduct
    );


function addProduct() {

    const code =
        document
            .getElementById("productCode")
            .value
            .trim();

    const name =
        document
            .getElementById("productName")
            .value
            .trim();

    const purchasePrice =
        Number(
            document
                .getElementById(
                    "productPurchasePrice"
                )
                .value
        );

    const sellingPrice =
        Number(
            document
                .getElementById(
                    "productSellingPrice"
                )
                .value
        );

    const quantity =
        Number(
            document
                .getElementById(
                    "productQuantity"
                )
                .value
        );


    if (!code || !name) {

        alert(
            "أدخل كود واسم المنتج."
        );

        return;
    }


    if (
        purchasePrice < 0 ||
        sellingPrice < 0 ||
        quantity < 0
    ) {

        alert(
            "تأكد من الأسعار والكمية."
        );

        return;
    }


    const exists =
        data.products.find(
            p =>
                String(p.code).toLowerCase() ===
                code.toLowerCase()
        );


    if (exists) {

        alert(
            "هذا الكود موجود بالفعل."
        );

        return;
    }


    data.products.push({

        code,

        name,

        purchasePrice,

        sellingPrice,

        quantity
    });


    saveData();

    document
        .getElementById("productCode")
        .value = "";

    document
        .getElementById("productName")
        .value = "";

    document
        .getElementById(
            "productPurchasePrice"
        )
        .value = "";

    document
        .getElementById(
            "productSellingPrice"
        )
        .value = "";

    document
        .getElementById(
            "productQuantity"
        )
        .value = "";


    renderAll();

    alert("تمت إضافة المنتج بنجاح.");
}


/* ================= PRODUCTS TABLE ================= */

document
    .getElementById("productSearch")
    .addEventListener(
        "input",
        renderProducts
    );


function renderProducts() {

    const body =
        document.getElementById(
            "productsBody"
        );


    const search =
        (
            document
                .getElementById(
                    "productSearch"
                )
                .value || ""
        )
        .toLowerCase()
        .trim();


    body.innerHTML = "";


    const products =
        data.products.filter(
            product => {

                return (
                    !search ||
                    String(product.name)
                        .toLowerCase()
                        .includes(search) ||
                    String(product.code)
                        .toLowerCase()
                        .includes(search)
                );
            }
        );


    products.forEach(product => {

        const quantity =
            Number(product.quantity || 0);


        let status = "";

        if (quantity <= 0) {

            status =
                `<span class="status empty">نفد</span>`;

        } else if (quantity <= 5) {

            status =
                `<span class="status low">منخفض</span>`;

        } else {

            status =
                `<span class="status good">جيد</span>`;
        }


        const stockValue =
            quantity *
            Number(product.purchasePrice || 0);


        const index =
            data.products.indexOf(product);


        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                ${escapeHtml(product.code)}
            </td>

            <td>
                ${escapeHtml(product.name)}
            </td>

            <td>
                ${money(product.purchasePrice)}
            </td>

            <td>
                ${money(product.sellingPrice)}
            </td>

            <td>
                ${quantity}
            </td>

            <td>
                ${money(stockValue)}
            </td>

            <td>
                ${status}
            </td>

            <td>

                <button
                    class="delete-item"
                    onclick="deleteProduct(${index})"
                >
                    حذف
                </button>

            </td>
        `;


        body.appendChild(row);
    });
}


/* ================= DELETE PRODUCT ================= */

function deleteProduct(index) {

    const product =
        data.products[index];

    if (!product) return;


    const confirmed =
        confirm(
            `هل تريد حذف المنتج "${product.name}"؟`
        );


    if (!confirmed) return;


    data.products.splice(index, 1);

    saveData();

    renderAll();
}


/* ================= PURCHASES ================= */

document
    .getElementById("addPurchaseBtn")
    .addEventListener(
        "click",
        addPurchase
    );


function addPurchase() {

    const date =
        document
            .getElementById("purchaseDate")
            .value ||
        todayString();

    const code =
        document
            .getElementById(
                "purchaseProductCode"
            )
            .value
            .trim();

    const name =
        document
            .getElementById(
                "purchaseProductName"
            )
            .value
            .trim();

    const price =
        Number(
            document
                .getElementById(
                    "purchasePrice"
                )
                .value
        );

    const quantity =
        Number(
            document
                .getElementById(
                    "purchaseQuantity"
                )
                .value
        );

    const paid =
        Number(
            document
                .getElementById(
                    "purchasePaid"
                )
                .value
        ) || 0;


    if (!code || !name) {

        alert(
            "أدخل بيانات المنتج."
        );

        return;
    }


    if (
        price < 0 ||
        quantity <= 0
    ) {

        alert(
            "تأكد من السعر والكمية."
        );

        return;
    }


    const total =
        price * quantity;

    const remaining =
        Math.max(0, total - paid);


    let product =
        data.products.find(
            p =>
                String(p.code).toLowerCase() ===
                code.toLowerCase()
        );


    if (product) {

        product.quantity =
            Number(product.quantity) +
            quantity;

        product.purchasePrice =
            price;

        if (!product.name) {
            product.name = name;
        }

    } else {

        product = {

            code,

            name,

            purchasePrice: price,

            sellingPrice: price,

            quantity
        };

        data.products.push(product);
    }


    data.purchases.push({

        date,

        code,

        name,

        price,

        quantity,

        total,

        paid,

        remaining
    });


    saveData();


    document
        .getElementById(
            "purchaseProductCode"
        )
        .value = "";

    document
        .getElementById(
            "purchaseProductName"
        )
        .value = "";

    document
        .getElementById(
            "purchasePrice"
        )
        .value = "";

    document
        .getElementById(
            "purchaseQuantity"
        )
        .value = "";

    document
        .getElementById(
            "purchasePaid"
        )
        .value = 0;


    renderAll();

    alert("تمت إضافة المشتريات وتحديث المخزون.");
}


/* ================= PURCHASE TABLE ================= */

function renderPurchases() {

    const body =
        document.getElementById(
            "purchasesBody"
        );


    body.innerHTML = "";


    data.purchases
        .slice()
        .reverse()
        .forEach(purchase => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${formatDate(purchase.date)}
                </td>

                <td>
                    ${escapeHtml(purchase.code)}
                </td>

                <td>
                    ${escapeHtml(purchase.name)}
                </td>

                <td>
                    ${money(purchase.price)}
                </td>

                <td>
                    ${purchase.quantity}
                </td>

                <td>
                    ${money(purchase.total)}
                </td>

                <td>
                    ${money(purchase.paid)}
                </td>

                <td>
                    ${money(purchase.remaining)}
                </td>

            `;


            body.appendChild(row);
        });


    if (data.purchases.length === 0) {

        body.innerHTML = `

            <tr>

                <td colspan="8">
                    لا توجد مشتريات.
                </td>

            </tr>

        `;
    }
}


/* ================= DASHBOARD ================= */

function renderDashboard() {

    const sales =
        data.sales.reduce(
            (sum, invoice) =>
                sum +
                Number(invoice.total || 0),
            0
        );


    const profit =
        data.sales.reduce(
            (sum, invoice) =>
                sum +
                Number(invoice.profit || 0),
            0
        );


    const remaining =
        data.sales.reduce(
            (sum, invoice) =>
                sum +
                Number(invoice.remaining || 0),
            0
        );


    document
        .getElementById("dashboardSales")
        .textContent =
        money(sales);


    document
        .getElementById("dashboardProfit")
        .textContent =
        money(profit);


    document
        .getElementById("dashboardRemaining")
        .textContent =
        money(remaining);


    document
        .getElementById("dashboardInvoices")
        .textContent =
        data.sales.length;


    renderRecentSales();

    renderStockAlerts();
}


/* ================= RECENT SALES ================= */

function renderRecentSales() {

    const body =
        document.getElementById(
            "recentSalesBody"
        );


    body.innerHTML = "";


    data.sales
        .slice()
        .reverse()
        .slice(0, 7)
        .forEach(invoice => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${escapeHtml(invoice.invoiceNumber)}
                </td>

                <td>
                    ${escapeHtml(invoice.customerName)}
                </td>

                <td>
                    ${formatDate(invoice.date)}
                </td>

                <td>
                    ${money(invoice.total)}
                </td>

                <td>
                    ${money(invoice.remaining)}
                </td>

            `;


            body.appendChild(row);
        });


    if (data.sales.length === 0) {

        body.innerHTML = `

            <tr>

                <td colspan="5">
                    لا توجد مبيعات حتى الآن.
                </td>

            </tr>

        `;
    }
}


/* ================= STOCK ALERTS ================= */

function renderStockAlerts() {

    const container =
        document.getElementById(
            "stockAlerts"
        );


    const lowProducts =
        data.products.filter(
            product =>
                Number(product.quantity || 0) <= 5
        );


    if (lowProducts.length === 0) {

        container.innerHTML = `

            <div class="stock-ok">
                ✅ المخزون بحالة جيدة.
            </div>

        `;

        return;
    }


    container.innerHTML = "";


    lowProducts.forEach(product => {

        const div =
            document.createElement("div");


        div.className =
            "stock-alert";


        div.innerHTML = `

            ⚠️
            <strong>
                ${escapeHtml(product.name)}
            </strong>

            —
            المتبقي:
            ${product.quantity}

        `;


        container.appendChild(div);
    });
}


/* ================= REPORTS ================= */

function renderReports() {

    const totalSales =
        data.sales.reduce(
            (sum, invoice) =>
                sum +
                Number(invoice.total || 0),
            0
        );


    const totalPurchases =
        data.purchases.reduce(
            (sum, purchase) =>
                sum +
                Number(purchase.total || 0),
            0
        );


    const totalProfit =
        data.sales.reduce(
            (sum, invoice) =>
                sum +
                Number(invoice.profit || 0),
            0
        );


    const stockValue =
        data.products.reduce(
            (sum, product) =>
                sum +
                (
                    Number(product.quantity || 0) *
                    Number(product.purchasePrice || 0)
                ),
            0
        );


    document
        .getElementById("reportSales")
        .textContent =
        money(totalSales);


    document
        .getElementById("reportPurchases")
        .textContent =
        money(totalPurchases);


    document
        .getElementById("reportProfit")
        .textContent =
        money(totalProfit);


    document
        .getElementById("reportStock")
        .textContent =
        money(stockValue);


    document
        .getElementById("reportDetails")
        .innerHTML = `

            <div class="report-row">

                <span>
                    عدد فواتير المبيعات
                </span>

                <strong>
                    ${data.sales.length}
                </strong>

            </div>


            <div class="report-row">

                <span>
                    عدد المنتجات
                </span>

                <strong>
                    ${data.products.length}
                </strong>

            </div>


            <div class="report-row">

                <span>
                    إجمالي المبيعات
                </span>

                <strong>
                    ${money(totalSales)} جنيه
                </strong>

            </div>


            <div class="report-row">

                <span>
                    إجمالي المشتريات
                </span>

                <strong>
                    ${money(totalPurchases)} جنيه
                </strong>

            </div>


            <div class="report-row">

                <span>
                    إجمالي الأرباح
                </span>

                <strong>
                    ${money(totalProfit)} جنيه
                </strong>

            </div>


            <div class="report-row">

                <span>
                    قيمة المخزون
                </span>

                <strong>
                    ${money(stockValue)} جنيه
                </strong>

            </div>

        `;
}


/* ================= PRINT REPORT ================= */

document
    .getElementById("printReportsBtn")
    .addEventListener(
        "click",
        printReports
    );


function printReports() {

    const totalSales =
        data.sales.reduce(
            (sum, invoice) =>
                sum + Number(invoice.total || 0),
            0
        );

    const totalPurchases =
        data.purchases.reduce(
            (sum, purchase) =>
                sum + Number(purchase.total || 0),
            0
        );

    const totalProfit =
        data.sales.reduce(
            (sum, invoice) =>
                sum + Number(invoice.profit || 0),
            0
        );

    const stockValue =
        data.products.reduce(
            (sum, product) =>
                sum +
                Number(product.quantity || 0) *
                Number(product.purchasePrice || 0),
            0
        );


    const printWindow =
        window.open(
            "",
            "_blank",
            "width=800,height=700"
        );


    if (!printWindow) {

        alert(
            "اسمح بالنوافذ المنبثقة للطباعة."
        );

        return;
    }


    printWindow.document.write(`

        <!DOCTYPE html>

        <html lang="ar" dir="rtl">

        <head>

            <meta charset="UTF-8">

            <title>تقرير المحل</title>

            <style>

                body {
                    font-family: Arial;
                    padding: 40px;
                }

                h1,
                h2 {
                    text-align: center;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 25px;
                }

                td {
                    border: 1px solid #ccc;
                    padding: 15px;
                }

            </style>

        </head>

        <body>

            <h1>المحل</h1>

            <h2>تقرير الإدارة</h2>

            <table>

                <tr>
                    <td>إجمالي المبيعات</td>
                    <td>${money(totalSales)} جنيه</td>
                </tr>

                <tr>
                    <td>إجمالي المشتريات</td>
                    <td>${money(totalPurchases)} جنيه</td>
                </tr>

                <tr>
                    <td>إجمالي الأرباح</td>
                    <td>${money(totalProfit)} جنيه</td>
                </tr>

                <tr>
                    <td>قيمة المخزون</td>
                    <td>${money(stockValue)} جنيه</td>
                </tr>

                <tr>
                    <td>عدد الفواتير</td>
                    <td>${data.sales.length}</td>
                </tr>

                <tr>
                    <td>عدد المنتجات</td>
                    <td>${data.products.length}</td>
                </tr>

            </table>

            <script>

                window.onload = function() {
                    window.print();
                };

            <\/script>

        </body>

        </html>

    `);

    printWindow.document.close();
}


/* ================= RENDER ALL ================= */

function renderAll() {

    renderCurrentInvoice();

    renderSalesArchive();

    renderProducts();

    renderPurchases();

    renderDashboard();

    renderReports();

    updateDate();
}


/* ================= INITIALIZE ================= */

document
    .getElementById("purchaseDate")
    .value = todayString();


setupNewInvoice();

renderAll();