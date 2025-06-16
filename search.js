const validationMessage = document.getElementById('validationMessage'); //message div
const orderId = document.getElementById('orderId');
const orderFrom = document.getElementById('orderFrom');
const orderTo = document.getElementById('orderTo');
const searchbutton = document.getElementById('searchSales'); //save button
const clearbutton = document.getElementById('clearFields'); //clear button
const salesTableBody = document.getElementById('salesTableBody');
const salesTotalCell = document.getElementById('salesTotal');
const exportExcel = document.getElementById('exportExcel');

// Initialize form and hide all sections on DOM load
window.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM fully loaded and parsed. Initializing form...");

    //Even listener for clear button
    clearbutton.addEventListener('click', () => {
        clearInput();
    });

    mockAPI();

    //Event listener for search button
    searchbutton.addEventListener('click', () => {
        if (validate()) {
            const params = new URLSearchParams();
            if (orderId.value) params.append('orderId', orderId.value);
            if (orderFrom.value) params.append('orderFrom', orderFrom.value);
            if (orderTo.value) params.append('orderTo', orderTo.value);

            fetch(`/searchSales?${params.toString()}`)
                .then(response => response.json())
                .then(data => {
                    console.log("Search results:", data);
                    addRows(data);
                    updateGrandTotal();
                })
                .catch(error => console.error("Error fetching sales records:", error));
        }
    });

    //Event listener for excel export button
    exportExcel.addEventListener('click', () => {
        if (validateTableRows()) {
            exportTableToExcel();
        }
    });
});

//Function to clear input fields
function clearInput() {
    console.log('Clearing input fields')
    orderId.value = '';
    orderFrom.value = ''
    orderTo.value = ''
    validationMessage.innerHTML = ''; // Clear validation message on clear
    validationMessage.setAttribute('class', '');
}

//Function to validate date range
function validate() {
    console.log('validating input fields');
    let isvalid = true;
    if (orderFrom.value && orderTo.value) {
        let order_From = new Date(orderFrom.value);
        let order_To = new Date(orderTo.value);
        if (order_From.getTime() > order_To.getTime()) {
            isvalid = false;
            validationMessage.innerText = 'Order Date (From) can\'t be later than Order Date (To).';
        }
    }
    if (!isvalid) {
        validationMessage.setAttribute('class', 'alert alert-danger');
    }
    else {
        validationMessage.innerText = '';
        validationMessage.setAttribute('class', '');
    }
    return isvalid;
}

//Function to add rows in table
function addRows(data) {
    salesTableBody.innerHTML = '';  // Clear previous rows
    for (let i = 0; i < data.length; i++) {
        const newRow = document.createElement('tr');

        const invoiceButton = data[i].invoice
            ? `<a href="${data[i].invoice}" target="_blank" class="btn btn-sm btn-primary">Download</a>`
            : `<span class="text-muted">N/A</span>`;

        newRow.innerHTML =
            `<td>${i + 1}</td>` +
            `<td>${data[i].orderid}</td>` +
            `<td>${data[i].orderdate}</td>` +
            `<td>${data[i].invoiceid}</td>` +
            `<td>${data[i].invoicedate}</td>` +
            `<td>${data[i].total}</td>` +
            `<td>${invoiceButton}</td>`;

        newRow.style.textAlign = 'center';
        salesTableBody.appendChild(newRow);
    }
}

//Function to calculate total sales
function updateGrandTotal() {
    grandTotal = 0;
    const rows = salesTableBody.getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].getElementsByTagName('td');
        if (cells.length > 5) { // Ensure the row has enough cells
            grandTotal += parseFloat(cells[5].textContent); // Sum up the total column values
        }
    }
    salesTotalCell.textContent = grandTotal.toFixed(2);

    console.log("Total sales updated:", grandTotal); // Debugging statement
}

//Function to validate empty table rows
function validateTableRows() {
    let rowExist = true;
    const rows = salesTableBody.getElementsByTagName('tr');
    if (rows.length == 0) {
        rowExist = false;
        validationMessage.innerText = 'No items to export !';
        validationMessage.setAttribute('class', 'alert alert-danger');
    }
    return rowExist;
}

function mockAPI() {
    // Mock fetch for /searchSales
    window.fetch = (originalFetch => {
        return function (url, options) {
            if (url.startsWith("/searchSales")) {
                console.log("Mock API called:", url);

                // Simulate filtered results based on URL params
                const sampleData = [
                    { orderid: 'ORD123', orderdate: '2024-01-15', invoiceid: 'INV001', invoicedate: '2024-01-16', total: 150.75, invoice: 'https://example.com/invoice1.pdf' },
                    { orderid: 'ORD456', orderdate: '2024-02-10', invoiceid: 'INV002', invoicedate: '2024-02-11', total: 299.99, invoice: 'https://example.com/invoice2.pdf' },
                    { orderid: 'ORD789', orderdate: '2024-03-05', invoiceid: 'INV003', invoicedate: '2024-03-06', total: 450.50, invoice: null }
                ];

                // Return a Promise that resolves with sample data
                return Promise.resolve({
                    json: () => Promise.resolve(sampleData)
                });
            } else {
                return originalFetch(url, options);
            }
        };
    })(window.fetch);
}

function exportTableToExcel() {
    const rows = salesTableBody.getElementsByTagName('tr');
    const data = [];
    let grandTotal = 0;

    // Add header row
    data.push(["S.No", "Order ID", "Order Date", "Invoice ID", "Invoice Date", "Total"]);

    // Add table data
    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].getElementsByTagName('td');
        const totalValue = parseFloat(cells[5].textContent) || 0;
        grandTotal += totalValue;

        data.push([
            cells[0].textContent,
            cells[1].textContent,
            cells[2].textContent,
            cells[3].textContent,
            cells[4].textContent,
            cells[5].textContent,
        ]);
    }

    // Add total row
    data.push(["", "", "", "", "Total Sales (in Rs)", grandTotal.toFixed(2)]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales");

    XLSX.writeFile(wb, "SalesData.xlsx");
}