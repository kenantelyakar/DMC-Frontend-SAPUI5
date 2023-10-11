sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/dm/dme/podfoundation/controller/PluginViewController",
    "sap/base/Log",
    "../scripts/apiCaller",
    "sap/m/MessageToast"
], function (JSONModel, PluginViewController, Log, ApiCall, MessageToast) {
    "use strict";


    var oPluginViewTemplateController = PluginViewController.extend("com.eczacibasi.viewplugins.inductionComponentEntry.controller.PluginView", {
        metadata: {
            properties: {
            }
        },

        onInit: function () {
            if (PluginViewController.prototype.onInit) {
                PluginViewController.prototype.onInit.apply(this, arguments);
            }

            /*induction Controls*/
            var oView = this.getView();
            if (!oView) {
                jQuery.sap.log.error("onRetrievePress: view for controller not defined");
                return;
            }
            this.viewModelData = {
                deleteMode: false
            }
            let oCheckBox = this.getView().byId("deleteMode");
            this.viewModelData.deleteMode = oCheckBox.getSelected();
            this.viewModel = new sap.ui.model.json.JSONModel();
            this.viewModel.setData(this.viewModelData);
            oView.setModel(this.viewModel, "viewModel");
            oCheckBox.attachSelect(function (oEvent) {
                this.viewModelData.deleteMode = oEvent.getSource().getSelected();
                this.viewModel.refresh();
                let data = this.componentsModel.getData().components;
                if (data) {
                    this.componentsModel.getData().components.map(function(x){x.userDefQty = 0});
                    this.componentsModel.getData().components.map(function(x){x.userDeleteQty = 0});
                    this.componentsModel.getData().components.map(function(x){x.valueState = sap.ui.core.ValueState.Information});
                    this.componentsModel.getData().components.map(function(x){x.valueMessage = this.getI18nText('insertQuantity')}.bind(this));
                    this.componentsModel.getData().components.map(function(x){x.valueDeleteState = sap.ui.core.ValueState.Information});
                    this.componentsModel.getData().components.map(function(x){x.valueDeleteMesssage = this.getI18nText('insertQuantity')}.bind(this));
                    this.getView().getModel("componentsModel").refresh();
                }
            }.bind(this));
            try {
                const plant = sap.dm.dme.util.PlantSettings.getCurrentPlant();
                const sfc = this.getPodSelectionModel().getOperations()[0].sfc;
                if (plant !== undefined && sfc !== undefined) {
                    const params = {
                        plant: plant,
                        sfc: sfc
                    };
                    apiGET("getBomBySfc", params, this.refreshComponentData.bind(this)).bind(this);
                }
            }catch (e) {
                console.warn("SFC bilgisi bulunamadı. " + e);
            }
            /*induction Controls*/
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
        refreshComponentData: function(oData){
            this.componentsModel = new sap.ui.model.json.JSONModel();
            this.componentsModel.setData(oData.data);
            this.getView().setModel(this.componentsModel,"componentsModel");
            this.maxChargeQty = oData.data.bomQuantity;
            this.getView().byId("chargeQty").setText(this.maxChargeQty);
            this.getView().byId("componentsListTable").selectAll();
            this.getView().byId("saveButton").setEnabled(true);
        },
        onSavePress: function (oEvent) {
            const oView = this.getView();
            if (!oView) {
                jQuery.sap.log.error(
                    "onRetrievePress: view for controller not defined"
                );
                return;
            }
            const oData =  this.componentsModel.getData().components;
            // Tum satirlari infoya cek
            oData.map(function (x) {
                x.valueState = sap.ui.core.ValueState.Information;
                x.valueMessage = this.getI18nText('insertQuantity');
                x.valueDeleteState = sap.ui.core.ValueState.Information;
                x.valueDeleteMesssage = this.getI18nText('insertQuantity');
            }.bind(this));
            // Ekleme - Kontrol Sartlari
            if (!this.viewModel.getData().deleteMode) {
                //Silme inputlarını 0'a cek
                oData.map(x => x.userDeleteQty = 0);
                let oTable = this.getView().byId("componentsListTable");
                const selectedIndices = oTable.getSelectedIndices();
                // Secilmis satirlarda ust limit kontrolu
                selectedIndices.map((x) => oData[x]).filter((x) => parseFloat(x.userDefQty) + parseFloat(x.sumQty) > parseFloat(x.maxLimit))
                    .map(function (x) {
                        x.valueState = sap.ui.core.ValueState.Error;
                        x.valueMessage = this.getI18nText('activeRowsMaxLimit');
                    }.bind(this));
                // Negatif Kontrolu
                oData.filter((x) => x.userDefQty < 0)
                    .map(function (x) {
                        x.valueState = sap.ui.core.ValueState.Error;
                        x.valueMessage = this.getI18nText('qtyNegative');
                    }.bind(this));
                let allSumDefQty = oData.map(item => parseFloat(item.userDefQty) + parseFloat(item.sumQty)).reduce((prev, next) => prev + next);
                //Toplam Gir. Mik. + Mik. Ekle = 0 kontrolu
                if (allSumDefQty < 1) {
                    oData.map(function (x) {
                        x.valueState = sap.ui.core.ValueState.Error;
                        x.valueMessage = "";
                    }.bind(this));
                    MessageToast.show(this.getI18nText('qtySumIsZero'), { duration: 500 });
                }
                //Toplam Gir. Mik. + Mik Ekle - Mik Sil > Maks Şarj Mik. kontrolu
                if (allSumDefQty > this.maxChargeQty) {
                    oData.map(function (x) {
                        x.valueState = sap.ui.core.ValueState.Error;
                        x.valueMessage = "";
                    });
                    MessageToast.show(this.getI18nText('qtySumMaxLimit'), { duration: 500 });
                }
            }
            // Silme - Kontrol Sartlari
            else {
                //Ekleme inputlarını 0'a cek
                oData.map(x => x.userDefQty = 0);
                // Negatif Kontrolu
                oData.filter((x) => x.userDeleteQty < 0)
                    .map(function (x) {
                        x.valueDeleteState = sap.ui.core.ValueState.Error;
                        x.valueDeleteMessage = this.getI18nText('qtyNegative');
                    }.bind(this))
                //Toplam miktar - Girilen Deger < 0 kontrolu
                oData.filter(x => x.userDeleteQty > 0).filter(x => parseFloat(x.sumQty) - parseFloat(x.userDeleteQty) < 0)
                    .map(function (x) {
                        x.valueDeleteState = sap.ui.core.ValueState.Error;
                        x.valueDeleteMessage = this.getI18nText('maxDeleteLimit');
                    }.bind(this));
                //Tum satirlar 0 kontrolu
                let sumUserDeleteDefQty = oData.map(item => parseFloat(item.userDeleteQty)).reduce((prev, next) => prev + next);
                if (sumUserDeleteDefQty === 0)
                    oData.map(function (x) {
                        x.valueDeleteState = sap.ui.core.ValueState.Error;
                        x.valueDeleteMessage = this.getI18nText('allRowsIsZero');
                    }.bind(this))
            }

            this.componentsModel.refresh();
            if (oData.filter((x) => x.valueState === sap.ui.core.ValueState.Error || x.valueDeleteState === sap.ui.core.ValueState.Error).length > 0)
                return false;
            const plant = sap.dm.dme.util.PlantSettings.getCurrentPlant();
            const oPodModel = this.getPodSelectionModel();
            var reqMethod = "POST";
            var url = "saveInductionComponents";
            var reqBody = {"params":{
                componentsList: this.componentsModel.getData().components,
                site: plant,
                insUser: this.getUserId(),
                sfc: oPodModel.getOperations()[0].sfc,
                shopOrder: oPodModel.getSelection().shopOrder.shopOrder,
                operation: oPodModel.getSelection().sfcData.operation,
                resource: oPodModel.getSelection().sfcData.workCenter,
                material: oPodModel.getSelection().sfcData.material
            }};
            apiPOST(url,reqBody,this.saveComponent.bind(this));
        },
        saveComponent : function (oData){
            if(oData.status < 300)
                sap.m.MessageBox.success(oData.message, {title: "Başarılı", actions: sap.m.MessageBox.Action.OK});
            else
                sap.m.MessageBox.error(oData.message, {title: "Hata", actions: sap.m.MessageBox.Action.OK});

            const plant = sap.dm.dme.util.PlantSettings.getCurrentPlant();
            const sfc = this.getPodSelectionModel().getOperations()[0].sfc;
            const params = {
                plant: plant,
                sfc: sfc
            };
            apiGET("getBomBySfc",params,this.refreshComponentData.bind(this)).bind(this);
            },
        addInputChanged: function (oEvent) {
            let oModel = this.getView().getModel("componentsModel");
            let dataIndex = oEvent.getSource().getBindingContext("componentsModel").sPath.split("/").reverse()[0];
            oModel.getData().components[dataIndex].userDeleteQty = 0
            oModel.refresh()

        },
        deleteInputChanged: function (oEvent) {
            let oModel = this.getView().getModel("componentsModel");
            let dataIndex = oEvent.getSource().getBindingContext("componentsModel").sPath.split("/").reverse()[0];
            oModel.getData().components[dataIndex].userDefQty = 0;
            oModel.refresh();

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
            apiGET("getBomBySfc",params,this.refreshComponentData.bind(this)).bind(this);
           /* if (this.isEventFiredByThisPlugin(oData)) {
                console.log(oData);
                return;
            }*/
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


