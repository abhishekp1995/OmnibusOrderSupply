const validationMessage = document.getElementById('validationMessage'); //message div
const orderId = document.getElementById('orderId');
const orderFrom = document.getElementById('orderFrom');
const orderTo = document.getElementById('orderTo');
const searchbutton = document.getElementById('searchSales'); //save button
const clearbutton = document.getElementById('clearFields'); //clear button
const salesTableBody = document.getElementById('salesTableBody');

// Initialize form and hide all sections on DOM load
window.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM fully loaded and parsed. Initializing form...");

    //Even listener for clear button
    clearbutton.addEventListener('click', () => {
        clearInput();
    });

    //Even listener for search button
    searchbutton.addEventListener('click', () => {
        if (validate()){
            
        }
    });
});

//Function to clear input fields
function clearInput(){
    console.log('Clearing input fields')
    orderId.value='';
    orderFrom.value=''
    orderTo.value=''
    validationMessage.innerHTML = ''; // Clear validation message on clear
    validationMessage.setAttribute('class', '');
}

//Function to validate date range
function validate(){
    console.log('validatng input fields')
    isvalid=true;
    if (orderFrom.value && orderTo.value)
    {   
        order_From = new Date(orderFrom.value);
        order_To = new Date(orderTo.value);
        if (order_From.getTime()>order_To.getTime())
        {   
            isvalid=false;
            validationMessage.innerText='Order Date (From) can\'t be earlier than Order Date (To).';
        }
    }
    if (!isvalid){
        validationMessage.setAttribute('class', 'alert alert-danger');
    }
    else{
        validationMessage.innerText='';
        validationMessage.setAttribute('class', '');
    }
    return isvalid;
}
