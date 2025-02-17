﻿function showAddPlanRecordModal() {
    $.get('/Vehicle/GetAddPlanRecordPartialView', function (data) {
        if (data) {
            $("#planRecordModalContent").html(data);
            //initiate datepicker
            initDatePicker($('#planRecordDate'));
            $('#planRecordModal').modal('show');
        }
    });
}
function showEditPlanRecordModal(planRecordId) {
    $.get(`/Vehicle/GetPlanRecordForEditById?planRecordId=${planRecordId}`, function (data) {
        if (data) {
            $("#planRecordModalContent").html(data);
            //initiate datepicker
            initDatePicker($('#planRecordDate'));
            $('#planRecordModal').modal('show');
            $('#planRecordModal').off('shown.bs.modal').on('shown.bs.modal', function () {
                if (getGlobalConfig().useMarkDown) {
                    toggleMarkDownOverlay("planRecordNotes");
                }
            });
        }
    });
}
function hideAddPlanRecordModal() {
    $('#planRecordModal').modal('hide');
    if (getPlanRecordModelData().createdFromReminder) {
        //show reminder Modal
        $("#reminderRecordModal").modal("show");
    }
}
function deletePlanRecord(planRecordId) {
    $("#workAroundInput").show();
    Swal.fire({
        title: "Confirm Deletion?",
        text: "Deleted Plan Records cannot be restored.",
        showCancelButton: true,
        confirmButtonText: "Delete",
        confirmButtonColor: "#dc3545"
    }).then((result) => {
        if (result.isConfirmed) {
            $.post(`/Vehicle/DeletePlanRecordById?planRecordId=${planRecordId}`, function (data) {
                if (data) {
                    hideAddPlanRecordModal();
                    successToast("Plan Record Deleted");
                    var vehicleId = GetVehicleId().vehicleId;
                    getVehiclePlanRecords(vehicleId);
                } else {
                    errorToast(genericErrorMessage());
                }
            });
        } else {
            $("#workAroundInput").hide();
        }
    });
}
function savePlanRecordToVehicle(isEdit) {
    //get values
    var formValues = getAndValidatePlanRecordValues();
    //validate
    if (formValues.hasError) {
        errorToast("Please check the form data");
        return;
    }
    //save to db.
    $.post('/Vehicle/SavePlanRecordToVehicleId', { planRecord: formValues }, function (data) {
        if (data) {
            successToast(isEdit ? "Plan Record Updated" : "Plan Record Added.");
            hideAddPlanRecordModal();
            if (!getPlanRecordModelData().createdFromReminder) {
                saveScrollPosition();
                getVehiclePlanRecords(formValues.vehicleId);
                if (formValues.addReminderRecord) {
                    setTimeout(function () { showAddReminderModal(formValues); }, 500);
                }
            }
        } else {
            errorToast(genericErrorMessage());
        }
    })
}
function showPlanRecordTemplatesModal() {
    var vehicleId = GetVehicleId().vehicleId;
    $.get(`/Vehicle/GetPlanRecordTemplatesForVehicleId?vehicleId=${vehicleId}`, function (data) {
        if (data) {
            $("#planRecordTemplateModalContent").html(data);
            hideAddPlanRecordModal();
            $('#planRecordTemplateModal').modal('show');
        }
    });
}
function hidePlanRecordTemplatesModal() {
    $('#planRecordTemplateModal').modal('hide');
    $('#planRecordModal').modal('show');
}
function usePlannerRecordTemplate(planRecordTemplateId) {
    $.post(`/Vehicle/ConvertPlanRecordTemplateToPlanRecord?planRecordTemplateId=${planRecordTemplateId}`, function (data) {
        if (data.success) {
            var vehicleId = GetVehicleId().vehicleId;
            successToast(data.message);
            $('#planRecordTemplateModal').modal('hide');
            hideAddPlanRecordModal();
            saveScrollPosition();
            getVehiclePlanRecords(vehicleId);
        } else {
            errorToast(data.message);
        }
    });
}

function deletePlannerRecordTemplate(planRecordTemplateId) {
    $("#workAroundInput").show();
    Swal.fire({
        title: "Confirm Deletion?",
        text: "Deleted Plan Templates cannot be restored.",
        showCancelButton: true,
        confirmButtonText: "Delete",
        confirmButtonColor: "#dc3545"
    }).then((result) => {
        if (result.isConfirmed) {
            $.post(`/Vehicle/DeletePlanRecordTemplateById?planRecordTemplateId=${planRecordTemplateId}`, function (data) {
                $("#workAroundInput").hide();
                if (data) {
                    successToast("Template Deleted");
                    hidePlanRecordTemplatesModal();
                } else {
                    errorToast(genericErrorMessage());
                }
            });
        } else {
            $("#workAroundInput").hide();
        }
    });
}
function savePlanRecordTemplate() {
    //get values
    var formValues = getAndValidatePlanRecordValues();
    //validate
    if (formValues.hasError) {
        errorToast("Please check the form data");
        return;
    }
    //save to db.
    $.post('/Vehicle/SavePlanRecordTemplateToVehicleId', { planRecord: formValues }, function (data) {
        if (data.success) {
            successToast(data.message);
        } else {
            errorToast(data.message);
        }
    })
}
function getAndValidatePlanRecordValues() {
    var planDescription = $("#planRecordDescription").val();
    var planCost = $("#planRecordCost").val();
    var planNotes = $("#planRecordNotes").val();
    var planType = $("#planRecordType").val();
    var planPriority = $("#planRecordPriority").val();
    var planProgress = $("#planRecordProgress").val();
    var planDateCreated = getPlanRecordModelData().dateCreated;
    var vehicleId = GetVehicleId().vehicleId;
    var planRecordId = getPlanRecordModelData().id;
    var reminderRecordId = getPlanRecordModelData().reminderRecordId;
    //validation
    var hasError = false;
    var extraFields = getAndValidateExtraFields();
    if (extraFields.hasError) {
        hasError = true;
    }
    if (planDescription.trim() == '') {
        hasError = true;
        $("#planRecordDescription").addClass("is-invalid");
    } else {
        $("#planRecordDescription").removeClass("is-invalid");
    }
    if (planCost.trim() == '' || !isValidMoney(planCost)) {
        hasError = true;
        $("#planRecordCost").addClass("is-invalid");
    } else {
        $("#planRecordCost").removeClass("is-invalid");
    }
    return {
        id: planRecordId,
        hasError: hasError,
        vehicleId: vehicleId,
        dateCreated: planDateCreated,
        description: planDescription,
        cost: planCost,
        notes: planNotes,
        files: uploadedFiles,
        supplies: selectedSupplies,
        priority: planPriority,
        progress: planProgress,
        importMode: planType,
        extraFields: extraFields.extraFields,
        requisitionHistory: supplyUsageHistory,
        reminderRecordId: reminderRecordId
    }
}
//drag and drop stuff.

let dragged = null;
let draggedId = 0;
function dragEnter(event) {
    event.preventDefault();
}
function dragStart(event, planRecordId) {
    dragged = event.target;
    draggedId = planRecordId;
    event.dataTransfer.setData('text/plain', draggedId);
}
function dragOver(event) {
    event.preventDefault();
}
function dropBox(event, newProgress) {
    if ($(event.target).hasClass("swimlane")) {
        if (dragged.parentElement != event.target && event.target != dragged) {
            updatePlanRecordProgress(newProgress);
        }
    }
    event.preventDefault();
}
function updatePlanRecordProgress(newProgress) {
    if (draggedId > 0) {
        if (newProgress == 'Done') {
            //if user is marking the task as done, we will want them to enter the mileage so that we can auto-convert it.
            Swal.fire({
                title: 'Mark Task as Done?',
                html: `<p>To confirm, please enter the current odometer reading on your vehicle, as we also need the current odometer to auto convert the task into the relevant record.</p>
                            <input type="text" inputmode="numeric" id="inputOdometer" class="swal2-input" placeholder="Odometer Reading">
                            `,
                confirmButtonText: 'Confirm',
                showCancelButton: true,
                focusConfirm: false,
                preConfirm: () => {
                    const odometer = $("#inputOdometer").val();
                    if (!odometer || isNaN(odometer)) {
                        Swal.showValidationMessage(`Please enter an odometer reading`)
                    }
                    return { odometer }
                },
            }).then(function (result) {
                if (result.isConfirmed) {
                    $.post('/Vehicle/UpdatePlanRecordProgress', { planRecordId: draggedId, planProgress: newProgress, odometer: result.value.odometer }, function (data) {
                        if (data) {
                            successToast("Plan Progress Updated");
                            var vehicleId = GetVehicleId().vehicleId;
                            getVehiclePlanRecords(vehicleId);
                        } else {
                            errorToast(genericErrorMessage());
                        }
                    });
                }
                draggedId = 0;
            });
        } else {
            $.post('/Vehicle/UpdatePlanRecordProgress', { planRecordId: draggedId, planProgress: newProgress }, function (data) {
                if (data) {
                    successToast("Plan Progress Updated");
                    var vehicleId = GetVehicleId().vehicleId;
                    getVehiclePlanRecords(vehicleId);
                } else {
                    errorToast(genericErrorMessage());
                }
            });
            draggedId = 0;
        }
    }
}