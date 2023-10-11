/* global XLSX */
sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/dm/dme/podfoundation/controller/PluginViewController",
    "sap/base/Log",
    "../scripts/apiCaller",
    "sap/m/MessageToast"
], function (JSONModel, PluginViewController, Log, ApiCall, MessageToast) {
    "use strict";


    var oPluginViewTemplateController = PluginViewController.extend("com.eczacibasi.viewplugins.batchNcUpload.controller.PluginView", {

        metadata: {
            properties: {
            }
        },

        onInit: function () {
            if (PluginViewController.prototype.onInit) {
                PluginViewController.prototype.onInit.apply(this, arguments);
            }


        },

        /**
         * @see PluginViewController.onBeforeRenderingPlugin()
         */
        onBeforeRenderingPlugin: function () {
            this.subscribe("PodSelectionChangeEvent", this.onPodSelectionChangeEvent, this);
            this.subscribe("OperationListSelectEvent", this.onOperationChangeEvent, this);
            this.subscribe("WorklistSelectEvent", this.onWorkListSelectEvent, this);
            var oConfig = this.getConfiguration();
            this.configureNavigationButtons(oConfig); 
        },

        onExit: function () {
            if (PluginViewController.prototype.onExit) {
                PluginViewController.prototype.onExit.apply(this, arguments);
            }
            this.unsubscribe("PodSelectionChangeEvent", this.onPodSelectionChangeEvent, this);
            this.unsubscribe("OperationListSelectEvent", this.onOperationChangeEvent, this);
            this.unsubscribe("WorklistSelectEvent", this.onWorkListSelectEvent, this);
        },

        onBeforeRendering: function () {
        },

        onAfterRendering: function () {
        },

        onSaveBatchUpload(oData){
            MessageToast.show(this.getI18nText('success'), { duration: 1000 });
            this.getView().setBusy(false);
        },

        cleanData: function (oData){
            var newOData = oData;
            var objKeys = Object.keys(oData[0]);
            for(var x in oData){
                var count = 0;
                for(var y in objKeys)
                    if(oData[x][objKeys[y]] === "" || oData[x][objKeys[y]]  === undefined) count++;
                if(count === objKeys.length)
                    newOData = oData.filter(z=> z!==oData[x]);
            }
            return newOData;
        },
        handleUploadPress: function(oEvent) {
            var oModel =this.getView().getModel("excelModel");
            if(oModel === undefined) return;
            if(oModel.getData() === undefined) return;
            this.getView().setBusy(true,0);
            var oData = this.getView().getModel("excelModel").getData();
            oData =this.cleanData(oData);
            console.log(oData);
            var reqBody= {
                "params": oData
            }
            apiPOST.bind(this)("createNCCodesBatch",reqBody,this.onSaveBatchUpload.bind(this));
        },

        handleTypeMissmatch: function(oEvent) {
            var aFileTypes = oEvent.getSource().getFileType();
            aFileTypes.map(function(sType) {
                return "*." + sType;
            });
            MessageToast.show(oEvent.getParameter("fileType") +
                this.getI18nText('fileTypeMissmatchError') +
                aFileTypes.join(", "));
        },
        readFile: function (oData){
            var oTable = this.byId("excelTable");
            oTable.removeAllColumns();
            oTable.unbindItems();
            var objKeys = Object.keys(oData[0]);
            var colArray = [];
            var cellArray = [];
            if(this.getView().getModel("excelModel") !== undefined){
                this.getView().getModel("excelModel").setData({});
                this.getView().getModel("excelModel").refresh();
            }
            var oModel = new sap.ui.model.json.JSONModel();
            oModel.setData(oData);
            this.getView().setModel(oModel, "excelModel");
            objKeys.forEach(txt=> {
                colArray.push(new sap.m.Column({
                    header : new sap.m.Label({
                        text : txt
                    })
                }));
                cellArray.push( new sap.m.Input({
                    value : "{excelModel>"+txt+"}"
                }));
            });
            colArray.push(new sap.m.Column({
                header: new sap.m.Label({
                    text: ""
                })
            }));
            cellArray.push(new sap.m.Button({
                icon:"sap-icon://decline",
                press:this.handleDeleteRowPress.bind(this)
            }))
            for(var v = 0 ; v<=colArray.length -1; v++){
                oTable.addColumn(colArray[v]);
            }
            oTable.bindItems("excelModel>/", new sap.m.ColumnListItem({
                cells :cellArray
            }));
            this.getView().setBusy(false);
        },
        handleAddRowPress:function (oEvent){
          var oModel = this.getView().getModel("excelModel");
          if(oModel === undefined) return;
          var oData = oModel.getData();
          var oDataCopy = {};
          var objKeys = Object.keys(oData[0]);
           objKeys.forEach(x=> {
               oDataCopy[x] = '';
          });
          oData.push(oDataCopy);
          oModel.setData(oData);
          oModel.refresh();
        },
        handleDeleteRowPress: function(oEvent){
            var oModel = this.getView().getModel("excelModel");
            if(oModel === undefined) return;
            var oData = oModel.getData();
            var oSource = oEvent.getSource();
            var oSourcePath = oSource.getBindingContext("excelModel").getPath().split("/")[1];
            var newOData = oData.filter(x=> x !== oData[oSourcePath]);
            oModel.setData(newOData);
            oModel.refresh();
            console.log(oEvent.getSource().getId());
        },
        handleValueChange: function(oEvent) {
            this.getView().setBusy(true,0);
            var params = {
                myFileUpload: oEvent.getParameter("files")[0]
            }
            apiPOSTFile.bind(this)("getExcelToJson",params,this.readFile.bind(this));
            MessageToast.show(this.getI18nText('controlXlsxFileInfo'));
        },

        onPodSelectionChangeEvent: function (sChannelId, sEventId, oData) {
            // don't process if same object firing event
            if (this.isEventFiredByThisPlugin(oData)) {
                return;
            }
        },

        onOperationChangeEvent: function (sChannelId, sEventId, oData) {
            // don't process if same object firing event
            const plant = sap.dm.dme.util.PlantSettings.getCurrentPlant();
            const sfc = this.getPodSelectionModel().getOperations()[0].sfc;
            const params = {
                plant: plant,
                sfc: sfc
            };
            apiGET("getBomBySfc",params,this.refreshComponentData.bind(this));
        },

        onWorkListSelectEvent: function (sChannelId, sEventId, oData) {
            // don't process if same object firing event
            if (this.isEventFiredByThisPlugin(oData)) {
                console.log(oData);
                return;
            }
        },
 
        configureNavigationButtons: function (oConfiguration) {
            if (!this.isPopup() && !this.isDefaultPlugin()) {
                this.byId("closeButton").setVisible(oConfiguration.closeButtonVisible);
            }
        } 
    });

    return oPluginViewTemplateController;
});


