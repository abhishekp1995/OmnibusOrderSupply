// Load dropdown data and handle form submission
document.addEventListener('DOMContentLoaded', function () {

  // Get references to all important DOM elements
  const categorySelect = document.getElementById('category');
  const validationMessage = document.getElementById('validationMessage');
  const subCategorySelect = document.getElementById('subCategory');
  const descriptionSelect = document.getElementById('description');
  const hsnInput = document.getElementById('hsn');
  const qtyInput = document.getElementById('qty');
  const priceInput = document.getElementById('price');
  const clearFields = document.getElementById('clearFields');
  const addEntry = document.getElementById('addEntry');
  const billingProcess = document.getElementById('billingProcess');
  const saveSale = document.getElementById('saveSale');
  const printInvoice = document.getElementById('printInvoice');
  const invoiceFields = document.getElementById('invoiceFields');
  const sameAsBillTo = document.getElementById('sameAsBillTo');
  const tableBody = document.getElementById('productTableBody');
  const grandTotalCell = document.getElementById('grandTotal');
  let grandTotal = 0;
  // 🌐 Global PDF blob to store generated PDF for later POST
  let generatedPDFBlob = null;
  // Load categories on page load
  console.log("Loading categories...");
  loadCategories();

  // Initialize the grand total display on page load
  console.log("Initializing grand total display...");
  updateGrandTotal();

  // Event listeners for category changes
  categorySelect.addEventListener('change', () => {
    console.log("Category changed, resetting fields and loading subcategories...");
    resetFields();
    subCategorySelect.disabled = false;
    subCategorySelect.value = 0;
    loadSubCategories();
  });

  // Event listeners for subcategory changes
  subCategorySelect.addEventListener('change', () => {
    if (subCategorySelect.value) { // Check if a valid subcategory is selected
      console.log("Subcategory changed, resetting fields and loading descriptions...");
      resetFields(); // Reset fields when subcategory changes
      descriptionSelect.disabled = false;
      descriptionSelect.value = 0;
      loadDescriptions();
    }
  });

  // Event listeners for description changes
  descriptionSelect.addEventListener('change', () => {
    console.log("Description changed, resetting fields and loading HSN code...");
    resetFields();
    qtyInput.disabled = false;
    priceInput.disabled = false
    loadHSN();
  });

  // Event listeners for clear button
  clearFields.addEventListener('click', () => {
    console.log("Clearing fields...");
    resetDropdowns();
    resetFields();
    setMessage('', '')
  });

  // Event listeners for add button
  addEntry.addEventListener('click', () => {
    if (validateData()) {
      console.log("Adding new entry to the table...");
      addRow(hsnInput, descriptionSelect, qtyInput.value, Number(priceInput.value));
      console.log("Enabling billing process button...");
      billingProcess.disabled = false;
      updateGrandTotal();
    }
  });

  // Event listener for delete row buttons
  tableBody.addEventListener('click', function (event) {
    if (event.target && event.target.classList.contains('delete-row')) {
      console.log("Deleting row...");
      const row = event.target.parentElement.parentElement;
      row.remove();

      // Re-number rows after deletion
      reNumberRows();
      updateGrandTotal();
      if (!validateTableRows()) {
        invoiceFields.style.display = 'none';
        billingProcess.disabled = true;
        setMessage('No items to invoice !', 'danger');
      }
    }
  });

  // Event listener to show/hide additional invoice fields
  billingProcess.addEventListener('click', function () {
    console.log("Validating table rows for invoice generation...");
    if (validateTableRows())
      invoiceFields.style.display = 'block';
  });

  // Event listener to copy billing info to shipping if checkbox is selected
  sameAsBillTo.addEventListener('change', function () {
    console.log("Copying billing information to shipping fields...");
    const shipName = document.getElementById('shipName');
    const shipPhone = document.getElementById('shipPhone');
    const shipEmail = document.getElementById('shipEmail');
    const shipAddress = document.getElementById('shipAddress');
    const shipDistrict = document.getElementById('shipDistrict');
    const shipState = document.getElementById('shipState');
    const shipPincode = document.getElementById('shipPincode');
    let billName = '';
    let billPhone = '';
    let billEmail = '';
    let billAddress = '';
    let billDistrict = '';
    let billState = '';
    let billPincode = '';
    let isdisabled = false;
    if (this.checked) {
      console.log("Checkbox checked, disabling shipping fields and copying billing info...");
      isdisabled = true;
      billName = document.getElementById('billName').value.trim();
      billPhone = document.getElementById('billPhone').value.trim();
      billEmail = document.getElementById('billEmail').value.trim();
      billAddress = document.getElementById('billAddress').value.trim();
      billDistrict = document.getElementById('billDistrict').value.trim();
      billState = document.getElementById('billState').value.trim();
      billPincode = document.getElementById('billPincode').value.trim();
    }
    enableDisableShippingFields(shipName, shipPhone, shipEmail, shipAddress, shipDistrict, shipState, shipPincode, isdisabled);
    copyBillingToShipping(shipName, shipPhone, shipEmail, shipAddress, shipDistrict, shipState, shipPincode, billName, billAddress, billPhone, billEmail, billDistrict, billState, billPincode)
  });

  // Event listener for the "Print Invoice" button
  printInvoice.addEventListener('click', function () {
    console.log("Generating PDF invoice...");
    if (validateBillingInfo()) {
      disableInputDeleteFields();
      disableBillingField();
      fetchShopAndBankDetails();
      generateInvoiceId();
      generatedPDFBlob = generateInvoicePDF();
      if (!generatedPDFBlob) {
        console.warn("No PDF blob found — generate invoice first!");
        setMessage("Please generate the invoice before saving the sale.", 'danger');
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }
      else
        saveSale.disabled = false;
    }
  });

  // Event listener for the "Print Invoice" button
  saveSale.addEventListener('click', function () {
    console.log("Saving sale information...");

    const saledata = {
      orderId: document.getElementById('orderId').value.trim(),
      orderDate: document.getElementById('orderDate').value,
      invoiceNo: document.getElementById('invoiceNo').value.trim(),
      invoiceDate: document.getElementById('invoiceDate').value,
      total: grandTotal
    };

    const formData = new FormData();
    formData.append('orderId', saledata.orderId);
    formData.append('orderDate', saledata.orderDate);
    formData.append('invoiceNo', saledata.invoiceNo);
    formData.append('invoiceDate', saledata.invoiceDate);
    formData.append('total', saledata.total);
    formData.append('invoicePdf', generatedPDFBlob, `Invoice_${saledata.invoiceNo}.pdf`);

    fetch('http://127.0.0.1:5000/addSale', {
      method: 'POST',
      body: formData
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to save sale');
        return response.json();
      })
      .then(data => {
        console.log("Sale saved successfully:", data);
        setMessage('Sale saved successfully!', 'success');
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      })
      .catch(error => {
        console.error("Error saving sale:", error);
        setMessage('Error saving sale.', 'danger');
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      });
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
    const price = priceInput.value.trim();
    const qty = qtyInput.value.trim();
    let message = '';

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
      setMessage(message, 'danger');
    } else {
      setMessage('', '');
    }
    return isValid;
  }

  //Function to validate billing information
  function validateBillingInfo() {
    const orderId = document.getElementById('orderId');
    const orderDate = document.getElementById('orderDate');
    //const invoiceNo = document.getElementById('invoiceNo');
    const invoiceDate = document.getElementById('invoiceDate');
    const billName = document.getElementById('billName');
    const billPhone = document.getElementById('billPhone');
    const billEmail = document.getElementById('billEmail');
    const billAddress = document.getElementById('billAddress');
    const billDistrict = document.getElementById('billDistrict');
    const billState = document.getElementById('billState');
    const billPincode = document.getElementById('billPincode');
    const shipName = document.getElementById('shipName');
    const shipPhone = document.getElementById('shipPhone');
    const shipEmail = document.getElementById('shipEmail');
    const shipAddress = document.getElementById('shipAddress');
    const shipDistrict = document.getElementById('shipDistrict');
    const shipState = document.getElementById('shipState');
    const shipPincode = document.getElementById('shipPincode');
    const paymentMode = document.getElementById('paymentMode');
    let message = '';
    let isValid = true;
    const phoneRegex = /^(?:\+1\s?)?(?:$)?(\d{3})(?:$)?[.\-\s]?(\d{3})[.\-\s]?(\d{4})$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (orderId.value.trim() == '') {
      message += 'Please enter order ID.\n';
      isValid = false;
    }
    if (orderDate.value == '') {
      message += 'Order date invalid or empty.\n';
      isValid = false;
    }
    // if (invoiceNo.value.trim() == '') {
    //   message += 'Please enter invoice number.\n';
    //   isValid = false;
    // }
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
    } else if (!billPhone.value.trim().match(phoneRegex)) {
      isValid = false
      message += 'Billing cutstomer\'s phone number not valid.\n';
    }
    if (billEmail.value.trim() != '') { // Corrected condition to check non-empty email field
      let isValidEmail = billEmail.value.trim().match(emailRegex);
      if (!isValidEmail) {
        message += 'Billing customer\'s email not in valid format.\n'; // Corrected typo from "cutstomer's" to "customer's"
        isValid = false;
      }
    }

    if ((billAddress.value.trim() == '') || (billDistrict.value.trim() == '') || (billState.value.trim() == '') || (billPincode.value.trim() == '')) {
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
    } else if (!shipPhone.value.trim().match(phoneRegex)) {
      isValid = false;
      message += 'Shipping cutstomer\'s phone number not valid.\n'; // Corrected typo from "cutstomer's" to "customer's"
    }
    if (shipEmail.value.trim() != '') { // Corrected condition to check non-empty email field
      let isValidEmail = shipEmail.value.trim().match(emailRegex);
      if (!isValidEmail) {
        message += 'Shipping customer\'s email not in valid format.\n'; // Corrected typo from "cutstomer's" to "customer's"
        isValid = false;
      }
    }

    if ((shipAddress.value.trim() == '') || (shipDistrict.value.trim() == '') || (shipState.value.trim() == '') || (shipPincode.value.trim() == '')) {
      message += 'Ensure shipping address, city, state and PIN code are filled\n';
      isValid = false;
    }
    if (paymentMode.value == '') {
      message += 'Payment mode not selected\n';
      isValid = false;
    }
    if (!isValid) {
      setMessage(message, 'danger');
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    } else {
      setMessage('', '');
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

    newRow.innerHTML =
      `<td>${tableBody.rows.length + 1}</td>` +
      `<td>${hsnInput.value}</td>` +
      `<td>${selectedDescription[1]}</td>` +
      `<td>${qtyInput}</td>` +
      `<td>${priceInput.toFixed(2)}</td>` +
      `<td>${total.toFixed(2)}</td>` +
      `<td><button type="button" class="btn btn-danger btn-sm delete-row">Delete</button></td>`;

    newRow.style.textAlign = 'center';
    tableBody.appendChild(newRow);

    // Clear the form
    resetDropdowns();
    resetFields();

    console.log("Row added to table:", newRow); // Debugging statement
  }

  // Function to re-number rows after deletion
  function reNumberRows() {
    const rows = tableBody.getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
      rows[i].getElementsByTagName('td')[0].textContent = i + 1;
    }
  }

  //Function to validate empty table rows
  // function validateTableRows() {
  //   const rows = tableBody.getElementsByTagName('tr');
  //   if (rows.length == 0) {
  //     invoiceFields.style.display = 'none';
  //     setMessage('No items to invoice !', 'danger');
  //   } else {
  //     invoiceFields.style.display = 'block';
  //   }
  // }

  //Function to validate empty table row
  function validateTableRows() {
    let rowExist = true;
    const rows = tableBody.getElementsByTagName('tr');
    if (rows.length == 0) {
      rowExist = false;
    }
    return rowExist;
  }

  //Function to disable shipping fields when "shipping same as billing" checkbox selected
  function enableDisableShippingFields(shipName, shipPhone, shipEmail, shipAddress, shipDistrict, shipState, shipPincode, isdisabled) {
    shipName.disabled = isdisabled;
    shipPhone.disabled = isdisabled;
    shipEmail.disabled = isdisabled;
    shipAddress.disabled = isdisabled;
    shipDistrict.disabled = isdisabled;
    shipState.disabled = isdisabled;
    shipPincode.disabled = isdisabled;

    console.log("Shipping fields enabled/disabled:", isdisabled); // Debugging statement
  }

  //Function to copy billing field values to shipping fields when "shipping same as billing" checkbox selected
  function copyBillingToShipping(shipName, shipPhone, shipEmail, shipAddress, shipDistrict, shipState, shipPincode, billName, billAddress, billPhone, billEmail, billDistrict, billState, billPincode) {
    shipName.value = billName;
    shipPhone.value = billPhone;
    shipEmail.value = billEmail;
    shipAddress.value = billAddress;
    shipDistrict.value = billDistrict;
    shipState.value = billState;
    shipPincode.value = billPincode;

    console.log("Billing info copied to shipping fields"); // Debugging statement
  }

  //Function to calculate grand total
  function updateGrandTotal() {
    grandTotal = 0;
    const rows = tableBody.getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].getElementsByTagName('td');
      if (cells.length > 5) { // Ensure the row has enough cells
        grandTotal += parseFloat(cells[5].textContent); // Sum up the total column values
      }
    }
    grandTotalCell.textContent = grandTotal.toFixed(2);

    console.log("Grand Total updated:", grandTotal); // Debugging statement
  }

  //Generate invoice ID
  function generateInvoiceId() {
    const invoiceNo = document.getElementById('invoiceNo');
    const orderId = document.getElementById('orderId').value.trim();
    let id = orderId;
    const currentYear = new Date().getFullYear();
    const nextYear = (currentYear + 1).toString().slice(2,4);


    fetch('http://127.0.0.1:5000/getInvoiceId')
      .then(response => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then(data => {
        console.log("Result:", data);
        if (data != null)
          id = data + 1;
      })
      .catch(error => {
        console.error("Error fetching last row Id, invoice ID will be taken from Order ID. Error:", error);
      });
      
      invoiceNo.value = `OT-${currentYear}-${nextYear}-${id}`;
  }

  // --- Shop and bank details fetch/parse functions ---
  function fetchShopAndBankDetails() {
    return fetch('details.txt')
      .then(response => response.text())
      .then(parseShopDetails)
      .catch(err => {
        console.error("Error loading shop details:", err);
        return {};
      });
  }

  function parseShopDetails(text) {
    const details = {};

    const lines = text.split('\n').map(l => l.trim());
    lines.forEach(line => {
      const [keyRaw, valueRaw] = line.split('=');
      if (!keyRaw || !valueRaw) return;
      const key = keyRaw.trim().toLowerCase().replace(/\s+/g, '_');
      const value = valueRaw.trim().replace(/;$/, '');
      details[key] = value;
    });

    return {
      shopname: details.name,
      address: details.address,
      district: details.district,
      state: details.state,
      pincode: details.pin_code,
      phone: details.phone,
      email: details.email,
      gst: details.gst,
      ac_no: details.a_c_no,
      bank_name: details.bank,
      branch: details.branch,
      ifsc: details.ifsc
    };
  }

  // Function to generate PDF invoice (now async, loads shop/bank details dynamically)
  async function generateInvoicePDF() {
    const {
      shopname,
      address,
      district,
      state,
      pincode,
      phone,
      email,
      gst,
      ac_no,
      bank_name,
      branch,
      ifsc
    } = await fetchShopAndBankDetails();

    const orderId = document.getElementById('orderId').value.trim();
    const orderDate = document.getElementById('orderDate').value;
    const invoiceNo = document.getElementById('invoiceNo').value.trim();
    const invoiceDate = document.getElementById('invoiceDate').value;
    const billName = document.getElementById('billName').value.trim();
    const billPhone = document.getElementById('billPhone').value.trim();
    const billEmail = document.getElementById('billEmail').value.trim();
    const billAddress = document.getElementById('billAddress').value.trim();
    const billDistrict = document.getElementById('billDistrict').value.trim();
    const billState = document.getElementById('billState').value.trim();
    const billPincode = document.getElementById('billPincode').value.trim();
    const shipName = document.getElementById('shipName').value.trim();
    const shipPhone = document.getElementById('shipPhone').value.trim();
    const shipEmail = document.getElementById('shipEmail').value.trim();
    const shipAddress = document.getElementById('shipAddress').value.trim();
    const shipDistrict = document.getElementById('shipDistrict').value.trim();
    const shipState = document.getElementById('shipState').value.trim();
    const shipPincode = document.getElementById('shipPincode').value.trim();
    const paymentMode = document.getElementById('paymentMode').value;

    console.log("Invoice PDF generation variables:", {
      shopname,
      address,
      district,
      state,
      pincode,
      phone,
      email,
      gst,
      ac_no,
      bank_name,
      branch,
      ifsc,
      orderId,
      orderDate,
      invoiceNo,
      invoiceDate,
      billName,
      billPhone,
      billEmail,
      billAddress,
      billDistrict,
      billState,
      billPincode,
      shipName,
      shipPhone,
      shipEmail,
      shipAddress,
      shipDistrict,
      shipState,
      shipPincode,
      paymentMode
    });

    generatedPDFBlob = generatePDF(shopname, address, district, state, pincode, phone, email, gst, ac_no, bank_name, branch, ifsc, orderId,
      orderDate, invoiceNo, invoiceDate, billName, billPhone, billEmail, billAddress, billDistrict, billState, billPincode,
      shipName, shipPhone, shipEmail, shipAddress, shipDistrict, shipState, shipPincode, paymentMode
    );

    return generatedPDFBlob;
  }

  //Function to disable input and delete fields when print invoice is clicked
  function disableInputDeleteFields() {
    addEntry.disabled = true;
    billingProcess.disabled = true
    categorySelect.value = 0;
    paymentMode.disabled = true;
    //To disable delete button in table
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
  }

  //Function to disable input and delete fields when print invoice is clicked
  function disableBillingField() {
    document.getElementById('orderId').disabled = true;
    document.getElementById('orderDate').disabled = true;
    document.getElementById('invoiceNo').disabled = true;
    document.getElementById('invoiceDate').disabled = true;
    document.getElementById('billName').disabled = true;
    document.getElementById('billPhone').disabled = true;
    document.getElementById('billEmail').disabled = true;
    document.getElementById('billAddress').disabled = true;
    document.getElementById('billDistrict').disabled = true;
    document.getElementById('billState').disabled = true;
    document.getElementById('billPincode').disabled = true;
    document.getElementById('sameAsBillTo').disabled = true;
    document.getElementById('shipName').disabled = true;
    document.getElementById('shipPhone').disabled = true;
    document.getElementById('shipEmail').disabled = true;
    document.getElementById('shipAddress').disabled = true;
    document.getElementById('shipDistrict').disabled = true;
    document.getElementById('shipState').disabled = true;
    document.getElementById('shipPincode').disabled = true;

  }

});
