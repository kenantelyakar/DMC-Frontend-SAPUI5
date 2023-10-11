jQuery.sap.require("sap.m.MessageBox");
const API_URL = "https://rndbackend.cfapps.us10-001.hana.ondemand.com/";
function apiGET (service , param,  afterMethod) {
    const searchParams = Object.entries(param).map(([key, val]) => `${key}=${val}`).join('&');
    $.ajax({
        url: API_URL + service +  "?" + searchParams,
        type: "GET",
        async: false,
        success: function (data) {
            console.log("Ajax Response: " + data);
            afterMethod(data);
        },
        error: function (error) {
            sap.m.MessageBox.error(error.responseText, {
                title: "Error",
                actions: sap.m.MessageBox.Action.CLOSE
            });
        },
    });
}
/*function apiPOST (service , param,  afterMethod) {
    $.ajax({
        url: API_URL + service,
        type: "POST",
        body:param,
        data:param,
        dataType:"json",
        async: false,
        success: function (data) {
            console.log("Ajax Response: " + data);
            afterMethod(data);
        },
        error: function (error) {
            sap.m.MessageBox.error(error.responseText, {
                title: "Error",
                actions: sap.m.MessageBox.Action.CLOSE
            });
        },
    });
}
*/
function apiPOST (service, param, afterMethod) {
    $.post(API_URL + service,JSON.stringify(param),(data, status) => {
        afterMethod(data);
    });
}


function standardAPI(param, method, url) {

    return new Promise(function (resolve, reject) {
        $.ajax({
            url: url,
            type: method,
            data: param,
            success: function (data) {
                resolve(data);
            },
            error: function (error) {
                reject(error);
            },
        });
    });
}

function customAPIGet   (method, url) {

    return new Promise(function (resolve, reject) {
        $.ajax({
            url: url,
            type: method,
            beforeSend: function (xhr) { },
            success: function (data) {
                resolve(data);
            },
            error: function (error) {
                reject(error);
            },
        });
    });
}