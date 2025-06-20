const validationMessage = document.getElementById('validationMessage'); //message div
const orderId = document.getElementById('orderId');
const orderFrom = document.getElementById('orderFrom');
const orderTo = document.getElementById('orderTo');
const searchbutton = document.getElementById('searchSales'); //save button
const clearbutton = document.getElementById('clearFields'); //clear button
const salesTableBody = document.getElementById('salesTableBody');
const salesTotalCell = document.getElementById('salesTotal');
const exportExcel = document.getElementById('exportExcel');
const ClearResults = document.getElementById('ClearResults');

// Initialize form and hide all sections on DOM load
window.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM fully loaded and parsed. Initializing form...");

    //Event listener for clear button
    clearbutton.addEventListener('click', () => {
        clearInput();
    });

    //Eventlistener to clear search results
    ClearResults.addEventListener('click', () => {
        if (validateTableRows()) {
            clearTable();
        }
        else
            setMessage('No items to clear !', 'danger')
    });

    //Event listener for search button
    searchbutton.addEventListener('click', () => {
        if (validateTableRows()) {
            clearTable();
        }
        if (validate()) {
            const params = new URLSearchParams();
            if (orderId.value.trim()) params.append('orderId', orderId.value);
            if (orderFrom.value) params.append('orderFrom', orderFrom.value);
            if (orderTo.value) params.append('orderTo', orderTo.value);

            // Check if there are any parameters to append
            const queryString = params.toString() ? `?${params.toString()}` : '';

            fetch(`http://127.0.0.1:5000/getSales${queryString}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Network response was not ok");
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("Search results:", data);
                    if (data.length == 0)
                        setMessage('No records found for given search parameters.', 'primary');
                    else {
                        addRows(data);
                        updateGrandTotal();
                    }
                })
                .catch(error => {
                    console.error("Error fetching sales records:", error);
                    setMessage('Failed to fetch sales records.', 'danger');
                });
        }

    });

    //Event listener for excel export button
    exportExcel.addEventListener('click', () => {
        if (validateTableRows())
            exportTableToExcel();
        else
            setMessage('No items to export !', 'danger')
    });
});

// Helper: Set message with type ('success', 'danger', 'warning', 'primary')
function setMessage(text, type) {
    validationMessage.innerText = text;
    if (type === "success") {
        validationMessage.setAttribute('class', 'alert alert-success');
    } else if (type === "danger") {
        validationMessage.setAttribute('class', 'alert alert-danger');
    } else if (type === "warning") {
        validationMessage.setAttribute('class', 'alert alert-warning');
    }
    else if (type == "primary") {
        validationMessage.setAttribute('class', 'alert alert-primary');
    } else {
        validationMessage.setAttribute('class', '');
    }
}

//Function to clear input fields
function clearInput() {
    console.log('Clearing input fields')
    orderId.value = '';
    orderFrom.value = ''
    orderTo.value = ''
    setMessage('', '');
}

//Function to clear table rows
function clearTable() {
    salesTableBody.innerHTML = ''; // Clear previous rows
    updateGrandTotal();
}

//Function to validate date range
function validate() {
    console.log('validating input fields');
    let isvalid = true;
    let message = '';
    if (orderFrom.value && orderTo.value) {
        let order_From = new Date(orderFrom.value);
        let order_To = new Date(orderTo.value);
        if (order_From.getTime() > order_To.getTime()) {
            isvalid = false;
            message += 'Order Date (From) can\'t be later than Order Date (To).';
        }
    }
    if (!isvalid) {
        setMessage(message, 'danger');
    }
    else {
        setMessage('', '');
    }
    return isvalid;
}

//Function to add rows in table
function addRows(data) {
    salesTableBody.innerHTML = '';  // Clear previous rows
    for (let i = 0; i < data.length; i++) {
        const newRow = document.createElement('tr');
        const invoiceButton = data[i][5]
            ? `<a href="/${data[i][5]}" target="_blank" class="btn btn-sm btn-primary">Download</a>`
            : `<span class="text-muted">N/A</span>`;

        newRow.innerHTML =
            `<td>${i + 1}</td>` +
            `<td>${data[i][0]}</td>` +
            `<td>${formatDate(data[i][1])}</td>` +
            `<td>${data[i][2]}</td>` +
            `<td>${formatDate(data[i][3])}</td>` +
            `<td>${data[i][4]}</td>` +
            `<td>${invoiceButton}</td>`;

        newRow.style.textAlign = 'center';
        salesTableBody.appendChild(newRow);
        console.log('Enabling excel export and clear result buttons...')
        exportExcel.disabled=false;
        ClearResults.disabled=false;
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

//Function to validate empty table row
function validateTableRows() {
    let rowExist = true;
    const rows = salesTableBody.getElementsByTagName('tr');
    if (rows.length == 0) {
        rowExist = false;
    }
    return rowExist;
}

//Function to export search results to excel
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

//Function to format date into DD-MM-YYYY
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // month is 0-based
    const year = date.getFullYear();
    const formattedDate = `${day}-${month}-${year}`;
    return formattedDate;
}