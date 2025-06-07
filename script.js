// Load dropdown data and handle form submission
document.addEventListener('DOMContentLoaded', function () {
  const categorySelect = document.getElementById('category');
  const validationMessage = document.getElementById('validationMessage');
  const subCategorySelect = document.getElementById('subCategory');
  const descriptionSelect = document.getElementById('description');
  const hsnInput = document.getElementById('hsn');
  const qtyInput = document.getElementById('qty');
  const priceInput = document.getElementById('price');
  const clearFields = document.getElementById('clearFields');
  const addEntry = document.getElementById('addEntry');
  const generateInvoice = document.getElementById('generateInvoice');
  const saveSale = document.getElementById('saveSale');
  const printInvoice = document.getElementById('printInvoice');
  const invoiceFields = document.getElementById('invoiceFields');
  const sameAsBillTo = document.getElementById('sameAsBillTo');
  const tableBody = document.getElementById('productTableBody');
  const grandTotalCell = document.getElementById('grandTotal');

  // Load categories on page load
  loadCategories();

  // Initialize the grand total display on page load
  updateGrandTotal();

  // Event listeners for category changes
  categorySelect.addEventListener('change', () => {
    resetFields();
    subCategorySelect.disabled = false;
    subCategorySelect.value = 0;
    loadSubCategories();
  });

  // Event listeners for subcategory changes
  subCategorySelect.addEventListener('change', () => {
    if (subCategorySelect.value) { // Check if a valid subcategory is selected
      resetFields(); // Reset fields when subcategory changes
      descriptionSelect.disabled = false;
      descriptionSelect.value = 0;
      loadDescriptions();
    }
  });

  // Event listeners for description changes
  descriptionSelect.addEventListener('change', () => {
    resetFields();
    qtyInput.disabled = false;
    priceInput.disabled = false
    loadHSN();
  });

  //Event listeners for clear button
  clearFields.addEventListener('click', () => {
    resetDropdowns();
    resetFields();
    validationMessage.innerHTML = ''; // Clear validation message on clear
    validationMessage.setAttribute('class', '');
  });

  //Event listeners for add button
  addEntry.addEventListener('click', () => {
    if (validateData()) {
      addRow(hsnInput, descriptionSelect, qtyInput.value, Number(priceInput.value));
      updateGrandTotal();
    }
  });

  // Event listener for delete row buttons
  tableBody.addEventListener('click', function (event) {
    if (event.target && event.target.classList.contains('delete-row')) {
      const row = event.target.parentElement.parentElement;
      row.remove();

      // Re-number rows after deletion
      reNumberRows();
      updateGrandTotal();
      validateTableRows();
    }
  });

  // Event listener to show/hide additional invoice fields
  generateInvoice.addEventListener('click', function () {
    validateTableRows();
  });

  //Event listener to copy billing info to shipping if checkbox is selected
  sameAsBillTo.addEventListener('change', function () {
    shipName = document.getElementById('shipName');
    shipPhone = document.getElementById('shipPhone');
    shipEmail = document.getElementById('shipEmail');
    shipAddress = document.getElementById('shipAddress');
    shipCity = document.getElementById('shipCity');
    shipState = document.getElementById('shipState');
    shipPincode = document.getElementById('shipPincode');
    billName = '';
    billPhone = '';
    billEmail = '';
    billAddress = '';
    billCity = '';
    billState = '';
    billPincode = '';
    isdisabled = false;
    if (this.checked) {
      isdisabled = true;
      billName = document.getElementById('billName').value.trim();
      billPhone = document.getElementById('billPhone').value.trim();
      billEmail = document.getElementById('billEmail').value.trim();
      billAddress = document.getElementById('billAddress').value.trim();
      billCity = document.getElementById('billCity').value.trim();
      billState = document.getElementById('billState').value.trim();
      billPincode = document.getElementById('billPincode').value.trim();
    }
    enableDisableShippingFields(shipName, shipPhone, shipEmail, shipAddress, shipCity, shipCity, shipState, shipPincode, isdisabled);
    copyBillingToShipping(shipName, shipPhone, shipEmail, shipAddress, shipCity, shipState, shipPincode, billName, billPhone, billEmail, billCity, billState, billPincode)
  });

  // Event listener for the "Print Invoice" button
  printInvoice.addEventListener('click', function () {
    if (validateBillingInfo()) {
    const rows = tableBody.getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
      // Get all cells in the current row
      const cells = rows[i].getElementsByTagName('td');
      // Check if there are at least 7 columns and if the 7th cell contains a button
      if (cells.length >= 7 && cells[6].querySelector('button')) {
        // Disable the button in the 7th column
        cells[6].querySelector('button').disabled = true;
      }
    }
      addEntry.disabled = true;
      saveSale.disabled = false;
      generateInvoicePDF();
    }
  });

  // Event listener for the "Print Invoice" button
  saveSale.addEventListener('click', function(){
    validationMessage.innerText = 'Sales saved successfully !'
    validationMessage.setAttribute('class', 'alert alert-success');
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    //location.reload()
  });

  // Function to clear existing options in the dropdown
  function clearOptions(selectElement) {
    while (selectElement.firstChild) {
      selectElement.removeChild(selectElement.firstChild);
    }
  }

  // Function to load categories
  function loadCategories() {
    fetch('data.xlsx')
      .then(response => response.arrayBuffer())
      .then(data => {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets["categories"];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        for (let i = 1; i < jsonData.length; i++) {
          const option = document.createElement('option');
          option.value = jsonData[i][0];
          option.textContent = jsonData[i][0];
          categorySelect.appendChild(option);
        }
      })
      .catch(error => console.error('Error loading categories:', error));
  }

  // Function to load subcategories based on selected category
  function loadSubCategories() {
    const selectedCategory = categorySelect.value.trim();
    if (!selectedCategory) return;

    fetch('data.xlsx')
      .then(response => response.arrayBuffer())
      .then(data => {
        console.log('Selected Category:', selectedCategory); // Debugging statement

        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets["subcategories"];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Clear existing options
        clearOptions(subCategorySelect);
        subCategorySelect.innerHTML = '<option value="0" disabled selected>--Choose Sub Category--</option>';

        for (let i = 1; i < jsonData.length; i++) {
          if (jsonData[i][0] === selectedCategory) {
            const option = document.createElement('option');
            option.value = jsonData[i][1];
            option.textContent = jsonData[i][1];
            subCategorySelect.appendChild(option);
          }
        }

        // Reset description dropdown and disable it
        clearOptions(descriptionSelect);
        descriptionSelect.innerHTML = '<option value="0" disabled selected>--Choose Description--</option>';
        descriptionSelect.disabled = true;
      })
      .catch(error => console.error('Error loading subcategories:', error));
  }

  // Function to load descriptions based on selected subcategory
  function loadDescriptions() {
    const selectedSubCategory = subCategorySelect.value.trim();
    if (!selectedSubCategory) return;

    fetch('data.xlsx')
      .then(response => response.arrayBuffer())
      .then(data => {
        console.log('Selected Sub Category:', selectedSubCategory); // Debugging statement

        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets["product_descriptions"];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Clear existing options
        clearOptions(descriptionSelect);
        descriptionSelect.innerHTML = '<option value="0" disabled selected>--Choose Description--</option>';

        for (let i = 1; i < jsonData.length; i++) {
          if (jsonData[i][3] === selectedSubCategory) {
            const option = document.createElement('option');
            option.value = `${jsonData[i][1]}|${jsonData[i][0]}`;
            option.textContent = jsonData[i][0];
            descriptionSelect.appendChild(option);
          }
        }

      })
      .catch(error => console.error('Error loading descriptions:', error));
  }

  // Function to load HSN code based on selected description
  function loadHSN() {
    const selectedDescription = descriptionSelect.value.split('|');
    hsnInput.value = selectedDescription[0];
  }

  // Function to reset price, qty and HSN fields
  function resetFields() {
    hsnInput.value = '';
    qtyInput.value = '';
    qtyInput.disabled = true;
    priceInput.value = '';
    priceInput.disabled = true
  }

  // Function to reset category, subcategory and description dropdowns
  function resetDropdowns() {
    categorySelect.value = 0;
    subCategorySelect.value = 0;
    subCategorySelect.disabled = true;
    descriptionSelect.value = 0;
    descriptionSelect.disabled = true;
  }

  //Function to validate input data
  function validateData() {
    let isValid = true;
    price = priceInput.value.trim()
    qty = qtyInput.value.trim()
    message = '';

    // Check for valid category
    if (categorySelect.value == 0) {
      message += 'Please select a category.\n';
      isValid = false;
    }

    // Check for valid subcategory
    if (subCategorySelect.value == 0) {
      message += 'Please select a sub-category.\n';
      isValid = false;
    }

    // Check for valid description
    if (descriptionSelect.value == 0) {
      message += 'Please select a description.\n';
      isValid = false;
    }

    // Check for valid quantity
    if (qty <= 0) {
      message += 'Invalid quantity input.\n';
      isValid = false;
    }

    // Check for valid price
    if (price <= 0) {
      message += 'Invalid price input.\n';
      isValid = false;
    }
    if (!isValid) {
      validationMessage.innerText = message;
      validationMessage.setAttribute('class', 'alert alert-danger');
    }
    else {
      validationMessage.innerText = '';
      validationMessage.setAttribute('class', '');
    }
    return isValid;
  }

  //Function to validate billing information
  function validateBillingInfo() {
    orderId = document.getElementById('orderId');
    orderDate = document.getElementById('orderDate');
    invoiceNo = document.getElementById('invoiceNo');
    invoiceDate = document.getElementById('invoiceDate');
    billName = document.getElementById('billName');
    billPhone = document.getElementById('billPhone');
    billEmail = document.getElementById('billEmail');
    billAddress = document.getElementById('billAddress');
    billCity = document.getElementById('billCity');
    billState = document.getElementById('billState');
    billPincode = document.getElementById('billPincode');
    shipName = document.getElementById('shipName');
    shipPhone = document.getElementById('shipPhone');
    shipEmail = document.getElementById('shipEmail');
    shipAddress = document.getElementById('shipAddress');
    shipCity = document.getElementById('shipCity');
    shipState = document.getElementById('shipState');
    shipPincode = document.getElementById('shipPincode');
    paymentMode = document.getElementById('paymentMode');
    message = '';
    isValid = true;
    const phoneRegex = /^(?:\+1\s?)?(?:$)?(\d{3})(?:$)?[.\-\s]?(\d{3})[.\-\s]?(\d{4})$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    ;

    if (orderId.value.trim() == '') {
      message += 'Please enter order ID.\n';
      isValid = false;
    }
    if (orderDate.value == '') {
      message += 'Order date invalid or empty.\n';
      isValid = false;
    }
    if (invoiceNo.value.trim() == '') {
      message += 'Please enter invoice number.\n';
      isValid = false;
    }
    if (invoiceDate.value == '') {
      message += 'Invoice date invalid or empty.\n';
      isValid = false;
    }
    if (billName.value.trim() == '') {
      message += 'Please enter billing customer\'s name .\n';
      isValid = false;
    }
    if (billPhone.value.trim() == '') {
      message += 'Please enter billing customer\'s phone number.\n';
      isValid = false;
    }
    else if (!billPhone.value.trim().match(phoneRegex)) {
      isValid = false
      message += 'Billing cutstomer\'s phone number not valid.\n';
    }
    if (!billEmail.value.trim() == '') {
      let isValid = billEmail.value.trim().match(emailRegex);
      if (!isValid)
        message += 'Billing cutstomer\'s email not in valid format.\n';
    }
    if ((billAddress.value.trim() == '') || (billCity.value.trim() == '') || (billState.value.trim() == '') || (billPincode.value.trim() == '')) {
      message += 'Ensure billing address, city, state and PIN code are filled\n';
      isValid = false;
    }
    if (shipName.value.trim() == '') {
      message += 'Please enter shipping customer\'s name.\n';
      isValid = false;
    }
    if (shipPhone.value.trim() == '') {
      message += 'Please enter shipping customer\'s phone number.\n';
      isValid = false;
    }
    else if (!shipPhone.value.trim().match(phoneRegex)) {
      isValid = false;
      message += 'Shipping cutstomer\'s phone number not valid.\n';
    }
    if (!shipEmail.value.trim() == '') {
      let isValid = shipEmail.value.trim().match(emailRegex);
      if (!isValid)
        message += 'Shipping cutstomer\'s email not in valid format.\n';
    }
    if ((shipAddress.value.trim() == '') || (shipCity.value.trim() == '') || (shipState.value.trim() == '') || (shipPincode.value.trim() == '')) {
      message += 'Ensure shiping address, city, state and PIN code are filled\n';
      isValid = false;
    }
    if (paymentMode.value == '') {
      message += 'Payment mode not selected\n';
      isValid = false;
    }
    if (!isValid) {
      validationMessage.innerText = message;
      validationMessage.setAttribute('class', 'alert alert-danger');
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
    else {
      validationMessage.innerText = '';
      validationMessage.setAttribute('class', '');
    }
    return isValid;
  }

  //Function to add rows to table for added entries in fields
  function addRow(hsnInput, descriptionSelect, qtyInput, priceInput) {
    // Calculate total
    const total = qtyInput * priceInput;

    // Create new table row
    const selectedDescription = descriptionSelect.value.split('|');
    const newRow = document.createElement('tr');
    const grandTotal = document.createElement('tr');
    newRow.innerHTML =
      `<td>${tableBody.rows.length + 1}</td>` +
      `<td>${hsnInput.value}</td>` +
      `<td>${selectedDescription[1]}</td>` +
      `<td>${qtyInput}</td>` +
      `<td>${priceInput.toFixed(2)}</td>` +
      `<td>${total.toFixed(2)}</td>` +
      `<td><button type="button" class="btn btn-danger btn-sm delete-row" style="margin-left:7%">Delete</button></td>`;

    newRow.style.textAlign = 'center'
    tableBody.appendChild(newRow);

    // Clear the form
    resetDropdowns();
    resetFields();
  }

  // Function to re-number rows after deletion
  function reNumberRows() {
    const rows = tableBody.getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
      rows[i].getElementsByTagName('td')[0].textContent = i + 1;
    }
  }

  //Function to validate empty table rows
  function validateTableRows() {
    const rows = tableBody.getElementsByTagName('tr');
    if (rows.length == 0) {
      invoiceFields.style.display = 'none';
      validationMessage.innerText = 'No items to invoice !';
      validationMessage.setAttribute('class', 'alert alert-danger');
    }
    else {
      invoiceFields.style.display = 'block';
    }
  }

  //Function to disabled shipping fields when shipping same as billing checkbox selected
  function enableDisableShippingFields(shipName, shipPhone, shipEmail, shipAddress, shipCity, shipCity, shipState, shipPincode, isdisabled) {
    shipName.disabled = isdisabled;
    shipPhone.disabled = isdisabled;
    shipEmail.disabled = isdisabled;
    shipAddress.disabled = isdisabled;
    shipCity.disabled = isdisabled;
    shipCity.disabled = isdisabled;
    shipState.disabled = isdisabled;
    shipPincode.disabled = isdisabled;
  }

  //Function to copy billing field values to shipping fields when "shipping same as billing" checkbox selected
  function copyBillingToShipping(shipName, shipPhone, shipEmail, shipAddress, shipCity, shipState, shipPincode, billName, billPhone, billEmail, billCity, billState, billPincode) {
    shipName.value = billName;
    shipPhone.value = billPhone;
    shipEmail.value = billEmail;
    shipAddress.value = billAddress;
    shipCity.value = billCity;
    shipState.value = billState;
    shipPincode.value = billPincode;
  }

  //Function to calculate grand total
  function updateGrandTotal() {
    let grandTotal = 0;
    const rows = tableBody.getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].getElementsByTagName('td');
      if (cells.length > 5) { // Ensure the row has enough cells
        grandTotal += parseFloat(cells[5].textContent); // Sum up the total column values
      }
    }
    grandTotalCell.textContent = grandTotal.toFixed(2);
  }

  // Function to generate PDF invoice
  async function generateInvoicePDF() {
    shopname = 'Omnibus Traders';
    address = 'Plot No. 326/3083, Indira Housing Colony, Lingipur, Bhubaseswar (dist.KHORDHA), Odisha, PIN-751002';
    phone = '+91-9439533573';
    email = 'omnibustraders@gmail.com';
    gst = '';
    orderId = document.getElementById('orderId').value.trim();
    orderDate = document.getElementById('orderDate');
    invoiceNo = document.getElementById('invoiceNo').value.trim();
    invoiceDate = document.getElementById('invoiceDate');
    billName = document.getElementById('billName').value.trim();
    billPhone = document.getElementById('billPhone').value.trim();
    billEmail = document.getElementById('billEmail').value.trim();
    billAddress = document.getElementById('billAddress').value.trim();
    billCity = document.getElementById('billCity').value.trim();
    billState = document.getElementById('billState').value.trim();
    billPincode = document.getElementById('billPincode').value.trim();
    shipName = document.getElementById('shipName').value.trim();
    shipPhone = document.getElementById('shipPhone').value.trim();
    shipEmail = document.getElementById('shipEmail').value.trim();
    shipAddress = document.getElementById('shipAddress').value.trim();
    shipCity = document.getElementById('shipCity').value.trim();
    shipState = document.getElementById('shipState').value.trim();
    shipPincode = document.getElementById('shipPincode').value.trim();
    paymentMode = document.getElementById('paymentMode').value.trim();
  }

});