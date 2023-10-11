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
            this.getView().setBusy(false);
            sap.m.MessageBox.error(error.responseText, {
                title: "Error",
                actions: sap.m.MessageBox.Action.CLOSE
            }.bind(this));
        },
    });
}
function apiPOST (service, param, afterMethod) {
    $.post(API_URL + service,JSON.stringify(param))
       .done((data, status) => {
           afterMethod(data);
        })
        .fail(function(e){
            this.getView().setBusy(false);
            sap.m.MessageBox.error(e.responseJSON.message, {
                title: "Error",
                actions: sap.m.MessageBox.Action.CLOSE
            });
        }.bind(this));
}
function apiPOSTFile (service, param, afterMethod) {
    var vd = new FormData();
    vd.append("myFileUpload", param.myFileUpload);
    fetch(API_URL + service, {
        body: vd,
        method: "POST"
    }).then(a=>{
        a.json().then(r => {
            afterMethod(r);
        });
    }).catch(function(e) {
        this.getView().setBusy(false);
        sap.m.MessageBox.error(e.message, {
            title: "Error",
            actions: sap.m.MessageBox.Action.CLOSE
        });
    }.bind(this));
}
