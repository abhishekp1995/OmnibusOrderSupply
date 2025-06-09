// Initialize IndexedDB for storing workbook persistently
initIndexedDB();

function initIndexedDB() {
    const request = indexedDB.open('WorkbookDB', 1);
    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('workbooks')) {
            db.createObjectStore('workbooks');
        }
    };
    request.onsuccess = () => {
        console.log("IndexedDB initialized successfully.");
    };
    request.onerror = (event) => {
        console.error("IndexedDB initialization failed:", event.target.error);
    };
}
// Global in-memory workbook variable to store Excel data in memory after first load
let memoryWorkbook = null;
const validationMessage = document.getElementById('validationMessage'); //message div
const categoryDiv = document.getElementById('categoryinput'); //category input div
const subcategoryDiv = document.getElementById('subcategoryinput'); //subcategory input div
const productDiv = document.getElementById('productinput'); //product entry div
const actionButtons = document.getElementById('actionButtons'); //div containing save and clear buttons
const categoryName = document.getElementById('categoryName');  //category input textbox when category entry
const selectCategory = document.getElementById('selectCategory'); // category selection dropdown when subcategory entry
const subCategoryName = document.getElementById('subCategoryName'); //sub category input text box when subcategory entry
const productCategory = document.getElementById('productCategory'); //product category dropdown when product entry
const productSubCategory = document.getElementById('productSubCategory'); //product sub category dropdown when product entry
const productDescription = document.getElementById('productDescription'); //product description text box when product entry
const hsnCode = document.getElementById('hsnCode'); //HSN code textbox when product entry
const savebutton = document.getElementById('savebutton'); //save button
const clearbutton = document.getElementById('clearbutton'); //clear button
const downloadbutton = document.getElementById('downloadbutton'); //download button to download updated excel data file
const resetCacheButton = document.getElementById('resetCacheButton'); //Button to clear from indexDB 
let inputoption = null; //variable to store input radio button option

// Initialize form and hide all sections on DOM load
window.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM fully loaded and parsed. Initializing form...");
    // Try to load workbook from IndexedDB before initializing UI
    await loadWorkbookFromIndexedDB();
    hideAll();
    document.querySelector('input[name="entryType"]:checked')?.click();
});

// Event listener for subcategory dropdown - enables subcategory name input when category is selected
selectCategory.addEventListener('change', () => {
    console.log("Category selected in subcategory entry. Enabling subcategory name input.");
    subCategoryName.disabled = false;
});

// Event listener for product category dropdown - loads subcategories and resets fields
productCategory.addEventListener('change', () => {
    console.log("Category changed in product entry, resetting fields and loading subcategories...");
    productDescription.disabled = true;
    hsnCode.disabled = true;
    productSubCategory.value = 0;
    productSubCategory.disabled = false;
    loadSubCategories(productCategory, productSubCategory);
});

// Event listener for product subcategory dropdown - enables product description and HSN fields
productSubCategory.addEventListener('change', () => {
    console.log("Sub Category changed in product entry, enabling product description and HSN code fields...");
    productSubCategory.disabled = false;
    productDescription.disabled = false;
    hsnCode.disabled = false;
});

// Event handler for save button - validates input and attempts to save
savebutton.addEventListener('click', () => {
    console.log("Save button clicked. Validating input...");
    if (validateInput()) {
        console.log("Validation passed. Proceed with saving data.");
        let mode = null;
        if (inputoption === 1) mode = "category";
        else if (inputoption === 2) mode = "subcategory";
        else if (inputoption === 3) mode = "product";
        appendToSheet(mode);
    } else {
        console.log("Validation failed. Please correct errors and try again.");
    }
});

// Event handler for clear button - resets form fields based on entry type
clearbutton.addEventListener('click', () => {
    console.log("Clear button clicked. Resetting form fields...");
    clearMessage();
    if (inputoption == 1) {
        categoryName.value = '';
        console.log("Cleared category name input.");
    }
    else if (inputoption == 2) {
        subCategoryName.value = '';
        subCategoryName.disabled = true;
        selectCategory.value = 0;
        console.log("Cleared subcategory inputs and disabled subcategory name.");
    }
    else if (inputoption == 3) {
        productCategory.value = 0;
        productSubCategory.value = 0;
        productSubCategory.disabled = true;
        productDescription.value = '';
        productDescription.disabled = true;
        hsnCode.value = '';
        hsnCode.disabled = true;
        console.log("Cleared product entry inputs and disabled relevant fields.");
    }
});

// Event handler for download button - triggers download of updated workbook
downloadbutton.addEventListener('click', () => {
    handleDownloadClick()
});

//Event listener for reset cache button to clear saved workbook from IndexedDB
resetCacheButton.addEventListener('click', () => {
    const request = indexedDB.open('WorkbookDB', 1);
    request.onsuccess = function (event) {
        const db = event.target.result;
        const transaction = db.transaction(['workbooks'], 'readwrite');
        const store = transaction.objectStore('workbooks');
        const deleteRequest = store.delete('memoryWorkbook');
        deleteRequest.onsuccess = function () {
            setMessage("Saved workbook cache cleared.", "success");
            memoryWorkbook = null;
            console.log("Workbook cache cleared from IndexedDB.");
        };
        deleteRequest.onerror = function () {
            setMessage("Failed to clear saved workbook cache.", "danger");
            console.error("Error clearing workbook from IndexedDB.");
        };
    };
});

// Event listener for radio selection - displays appropriate input fields
document.querySelectorAll('input[name="entryType"]').forEach(radio => {
    radio.addEventListener('change', function () {
        console.log("Entry type changed to:", this.value);
        hideAll();
        if (this.value === 'category') {
            categoryDiv.style.display = 'block';
            inputoption = 1;
            console.log("Showing category input fields.");
        }
        else if (this.value === 'subcategory') {
            console.log("Loading categories for subcategory entry.");
            loadCategories(selectCategory); // Load categories when adding subcategories
            subcategoryDiv.style.display = 'block';
            inputoption = 2;
            console.log("Showing subcategory input fields.");
        }
        else if (this.value === 'product') {
            console.log("Loading categories for product entry.");
            loadCategories(productCategory);
            productDiv.style.display = 'block';
            inputoption = 3;
            console.log("Showing product input fields.");
        }
        actionButtons.style.display = 'block';
        //Clear validation message on input change
        clearMessage();
    }
    );
});

// Hide all input fields initially and disable inputs
function hideAll() {
    console.log("Hiding all input sections and disabling input fields.");
    if (categoryDiv) categoryDiv.style.display = 'none';
    if (subcategoryDiv) subcategoryDiv.style.display = 'none';
    if (productDiv) productDiv.style.display = 'none';
    if (actionButtons) actionButtons.style.display = 'none';

    disableFieldsOnInputChange();
}

// Validate input fields based on selected entry type
function validateInput() {
    let message = '';
    let isvalid = true;

    if (inputoption === null) {
        message += 'Please select an entry type.\n';
        isvalid = false;
    }

    if (inputoption == 1) {
        if (categoryName.value.trim() === '') {
            message += 'Please enter category name.\n';
            isvalid = false;
        }
    }
    else if (inputoption == 2) {
        if (subCategoryName.value.trim() === '') {
            message += 'Please enter sub category name.\n';
            isvalid = false;
        }
        if (selectCategory.value == 0) {
            message += 'Please select category.\n';
            isvalid = false;
        }
    }
    else if (inputoption == 3) {
        if (productSubCategory.value == 0) {
            message += 'Please select sub category.\n';
            isvalid = false;
        }
        if (productCategory.value == 0) {
            message += 'Please select category.\n';
            isvalid = false;
        }
        if (productDescription.value.trim() === '') {
            message += 'Please enter product.\n';
            isvalid = false;
        }
        if (hsnCode.value.trim() === '') {
            message += 'Please enter HSN code.\n';
            isvalid = false;
        }
    }

    console.log("Validation result:", isvalid, "Message:", message);

    if (!isvalid) {
        validationMessage.innerText = message;
        validationMessage.setAttribute('class', 'alert alert-danger');
    } else {
        clearMessage();
    }

    return isvalid;
}

// Clear all options in a dropdown element
function clearOptions(selectElement) {
    console.log("Clearing options for dropdown:", selectElement.id);
    while (selectElement.firstChild) {
        selectElement.removeChild(selectElement.firstChild);
    }
}

// Clear validation message and alert classes
function clearMessage() {
    console.log("Clearing validation messages.");
    validationMessage.innerText = '';
    validationMessage.setAttribute('class', '');
}

// Disable input fields and reset values on entry type change
function disableFieldsOnInputChange() {
    console.log("Disabling input fields and resetting values on input change.");
    productCategory.value = 0;
    productSubCategory.value = 0
    productSubCategory.disabled = true;
    productDescription.disabled = true;
    hsnCode.disabled = true;

    selectCategory.value = 0;
    subCategoryName.value = '';
    subCategoryName.disabled = true;
}

// Load categories from excel file or memory and populate dropdown
function loadCategories(category) {
    // If memoryWorkbook exists, use it; otherwise, fetch from file
    if (memoryWorkbook) {
        // Use in-memory workbook
        const sheet = memoryWorkbook.Sheets["categories"];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        clearOptions(category);
        category.innerHTML = '<option value="0" disabled selected>-- Select Category --</option>';
        for (let i = 1; i < jsonData.length; i++) {
            const option = document.createElement('option');
            option.value = jsonData[i][0];
            option.textContent = jsonData[i][0];
            category.appendChild(option);
        }
        console.log("Categories loaded from in-memory workbook and dropdown populated.");
    } else {
        // No workbook in memory, fetch from file
        console.log("Loading categories from data.xlsx...");
        fetch('data.xlsx')
            .then(response => response.arrayBuffer())
            .then(data => {
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets["categories"];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                clearOptions(category);
                category.innerHTML = '<option value="0" disabled selected>-- Select Category --</option>';
                for (let i = 1; i < jsonData.length; i++) {
                    const option = document.createElement('option');
                    option.value = jsonData[i][0];
                    option.textContent = jsonData[i][0];
                    category.appendChild(option);
                }
                console.log("Categories loaded from file and dropdown populated.");
            })
            .catch(error => console.error('Error loading categories:', error));
    }
}

// Load subcategories for selected category and populate dropdown
function loadSubCategories(category, subcategory) {
    // If memoryWorkbook exists, use it; otherwise, fetch from file
    const selectedCategory = category.value.trim();
    if (!category) {
        console.log("Category element not found. Aborting subcategory load.");
        return;
    }
    if (memoryWorkbook) {
        const sheet = memoryWorkbook.Sheets["subcategories"];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        clearOptions(subcategory);
        subcategory.innerHTML = '<option value="0" disabled selected>-- Select Sub Category --</option>';
        for (let i = 1; i < jsonData.length; i++) {
            if (jsonData[i][0] === selectedCategory) {
                const option = document.createElement('option');
                option.value = jsonData[i][1];
                option.textContent = jsonData[i][1];
                subcategory.appendChild(option);
            }
        }
        console.log("Subcategories loaded from in-memory workbook and dropdown populated.");
    } else {
        console.log("Loading sub categories for selected category:", category.value);
        fetch('data.xlsx')
            .then(response => response.arrayBuffer())
            .then(data => {
                console.log('Selected Category:', selectedCategory); // Debugging statement
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets["subcategories"];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                clearOptions(subcategory);
                subcategory.innerHTML = '<option value="0" disabled selected>-- Select Sub Category --</option>';
                for (let i = 1; i < jsonData.length; i++) {
                    if (jsonData[i][0] === selectedCategory) {
                        const option = document.createElement('option');
                        option.value = jsonData[i][1];
                        option.textContent = jsonData[i][1];
                        subcategory.appendChild(option);
                    }
                }
                console.log("Subcategories loaded from file and dropdown populated.");
            })
            .catch(error => console.error('Error loading subcategories:', error));
    }
}

// Append data to the appropriate sheet, checking for duplicates/partials, and update in-memory workbook
function appendToSheet(mode) {
    // mode: "category", "subcategory", "product"
    // If memoryWorkbook is not loaded, fetch and load it first, then call self again
    if (memoryWorkbook === null) {
        fetch('data.xlsx')
            .then(response => response.arrayBuffer())
            .then(data => {
                memoryWorkbook = XLSX.read(data, { type: 'array' });
                appendToSheet(mode); // call again, now with memoryWorkbook loaded
            })
            .catch(error => {
                setMessage("Error loading workbook: " + error, "danger");
                console.error('Error loading workbook in appendToSheet:', error);
            });
        return;
    }
    let workbook = memoryWorkbook;
    let sheetName, headers, rowToAdd = [];
    let duplicate = false;
    let partialDuplicate = false;
    let partialMessage = "";

    // --- CATEGORY ENTRY ---
    if (mode === "category") {
        sheetName = "categories";
        headers = ["Category"];
        const catVal = categoryName.value.trim();
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        // Check for exact product match (full duplicate)
        for (let i = 1; i < jsonData.length; i++) {
            if ((jsonData[i][0] || '').toString().trim().toLowerCase() === catVal.toLowerCase()) {
                duplicate = true;
                break;
            }
        }
        console.log(`[appendToSheet][category] category='${catVal}', duplicate=${duplicate}`);
        if (duplicate) {
            setMessage("Category already exists, unable to save.", "danger");
            console.log("Category duplicate detected, not saving.");
            return;
        }
        // Add new row
        rowToAdd = [catVal];
    }
    // --- SUBCATEGORY ENTRY ---
    else if (mode === "subcategory") {
        sheetName = "subcategories";
        headers = ["Category", "Subcategory"];
        const catVal = selectCategory.value.trim();
        const subcatVal = subCategoryName.value.trim();
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        // Check for exact product match (full duplicate)
        for (let i = 1; i < jsonData.length; i++) {
            let rowCat = (jsonData[i][0] || '').toString().trim();
            let rowSubcat = (jsonData[i][1] || '').toString().trim();
            if (rowCat.toLowerCase() === catVal.toLowerCase() && rowSubcat.toLowerCase() === subcatVal.toLowerCase()) {
                duplicate = true;
                break;
            }
            // Check for product with same name but different details (partial duplicate)
            else if ((rowCat.toLowerCase() != catVal.toLowerCase()) &&
                (rowSubcat.toLowerCase() === subcatVal.toLowerCase())) {
                partialDuplicate = true;
                partialMessage = "Subcategory exists under 1 or more category. ";
            }
        }
        console.log(`[appendToSheet][subcategory] cat='${catVal}', subcat='${subcatVal}', duplicate=${duplicate}, partialDuplicate=${partialDuplicate}`);
        if (duplicate) {
            setMessage("Subcategory already exists under the selected category, unable to save.", "danger");
            console.log("Subcategory duplicate detected, not saving.");
            return;
        }
        if (partialDuplicate) {
            setMessage(partialMessage, "warning");
            // Allow save to proceed after warning
        }
        rowToAdd = [catVal, subcatVal];
    }
    // --- PRODUCT ENTRY ---
    else if (mode === "product") {
        sheetName = "product_descriptions";
        headers = ["Product Description", "HSN", "Category", "Subcategory"];
        const catVal = productCategory.value.trim();
        const subcatVal = productSubCategory.value.trim();
        const descVal = productDescription.value.trim();
        const hsnVal = hsnCode.value.trim();
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        // Check for exact product match (full duplicate)
        for (let i = 1; i < jsonData.length; i++) {
            let rowCat = (jsonData[i][2] || '').toString().trim();
            let rowSubcat = (jsonData[i][3] || '').toString().trim();
            let rowDesc = (jsonData[i][0] || '').toString().trim();
            let rowHsn = (jsonData[i][1] || '').toString().trim();
            if (
                rowCat.toLowerCase() === catVal.toLowerCase() &&
                rowSubcat.toLowerCase() === subcatVal.toLowerCase() &&
                rowDesc.toLowerCase() === descVal.toLowerCase() &&
                rowHsn.trim() === hsnVal.trim()
            ) {
                duplicate = true;
                break;
            }
            // Check for product with same name but at least one different detail (partial duplicate)
            else if (
                rowDesc.toLowerCase() === descVal.toLowerCase() &&
                (
                    rowCat.toLowerCase() !== catVal.toLowerCase() ||
                    rowSubcat.toLowerCase() !== subcatVal.toLowerCase() ||
                    rowHsn.toLowerCase().trim() !== hsnVal.toLowerCase().trim()
                )
            ) {
                partialDuplicate = true;
                partialMessage = "Product exists under one or more category, subcategory or HSN code combination.";
            }
        }
        console.log(`[appendToSheet][product] desc='${descVal}', hsn='${hsnVal}', cat='${catVal}', subcat='${subcatVal}', duplicate=${duplicate}, partialDuplicate=${partialDuplicate}`);
        if (duplicate) {
            setMessage("Product already exists under the selected category, subcategory and HSN code, unable to save.", "danger");
            console.log("Product duplicate detected, not saving.");
            return;
        }
        if (partialDuplicate) {
            setMessage(partialMessage, "warning");
            // Allow save to proceed after warning
        }
        rowToAdd = [descVal, hsnVal, catVal, subcatVal];
    }
    else {
        setMessage("Unknown mode.", "danger");
        console.log(`[appendToSheet] Unknown mode: ${mode}`);
        return;
    }
    // Append row to sheet
    let sheet = workbook.Sheets[sheetName];
    let jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    jsonData.push(rowToAdd);
    // Update sheet
    const newSheet = XLSX.utils.aoa_to_sheet(jsonData);
    workbook.Sheets[sheetName] = newSheet;
    // Do NOT trigger download here; just update in-memory workbook
    if (partialDuplicate) {
        setMessage("Saved successfully with warning: " + partialMessage, "warning");
        console.log(`[appendToSheet] Saved with warning: ${partialMessage}`);
    }
    else {
        setMessage("Saved successfully.", "success");
        console.log(`[appendToSheet] Saved successfully to '${sheetName}'.`);
    }
    console.log(`[appendToSheet] row added:`, rowToAdd, `| sheet: ${sheetName}`);
    // Save to IndexedDB after modifying workbook
    saveWorkbookToIndexedDB(memoryWorkbook);
}

// Helper: Set message with type ('success', 'danger', 'warning')
function setMessage(text, type) {
    validationMessage.innerText = text;
    if (type === "success") {
        validationMessage.setAttribute('class', 'alert alert-success');
    } else if (type === "danger") {
        validationMessage.setAttribute('class', 'alert alert-danger');
    } else if (type === "warning") {
        validationMessage.setAttribute('class', 'alert alert-warning');
    } else {
        validationMessage.setAttribute('class', '');
    }
}

// Handle download click and provide user feedback
function handleDownloadClick() {
    if (!memoryWorkbook) {
        setMessage("No workbook in memory. Please save at least one entry before downloading.", "danger");
        return;
    }
    if (confirm('Do you want to download the final file?')) {
        try {
            const wbout = XLSX.write(memoryWorkbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'data.xlsx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setMessage("File downloaded successfully.", "success");
        } catch (err) {
            setMessage("Error during download: " + err, "danger");
        }
    }
}
// Save the in-memory workbook to IndexedDB
function saveWorkbookToIndexedDB(workbook) {
    if (!workbook) return;
    try {
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const request = indexedDB.open('WorkbookDB', 1);
        request.onsuccess = function (event) {
            const db = event.target.result;
            const transaction = db.transaction(['workbooks'], 'readwrite');
            const store = transaction.objectStore('workbooks');
            store.put(wbout, 'memoryWorkbook');
            transaction.oncomplete = function () {
                console.log("Workbook saved to IndexedDB.");
            };
            transaction.onerror = function (event) {
                console.error("Error saving workbook to IndexedDB:", event.target.error);
            };
        };
        request.onerror = function (event) {
            console.error("Error opening IndexedDB for saving workbook:", event.target.error);
        };
    } catch (err) {
        console.error("Error serializing workbook for IndexedDB:", err);
    }
}

// Load the workbook from IndexedDB if it exists
function loadWorkbookFromIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('WorkbookDB', 1);
        request.onsuccess = function (event) {
            const db = event.target.result;
            const transaction = db.transaction(['workbooks'], 'readonly');
            const store = transaction.objectStore('workbooks');
            const getRequest = store.get('memoryWorkbook');
            getRequest.onsuccess = function (event) {
                const result = event.target.result;
                if (result) {
                    try {
                        memoryWorkbook = XLSX.read(result, { type: 'array' });
                        console.log("Workbook loaded from IndexedDB.");
                    } catch (err) {
                        console.error("Error parsing workbook from IndexedDB:", err);
                        memoryWorkbook = null;
                    }
                } else {
                    console.log("No workbook found in IndexedDB.");
                }
                resolve();
            };
            getRequest.onerror = function (event) {
                console.error("Error loading workbook from IndexedDB:", event.target.error);
                resolve();
            };
        };
        request.onerror = function (event) {
            console.error("Error opening IndexedDB for loading workbook:", event.target.error);
            resolve();
        };
    });
}

