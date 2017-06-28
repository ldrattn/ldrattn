var option_display = 0;
var parent_display = 0;
var calibstatus_interval = 0;

function showMenu() {
	if (option_display == 0) {
		var div = document.getElementById('option-list-box');
		div.style.display = 'block';
		option_display = 1;
		parent_display = 0;
	} else {
		var div = document.getElementById('option-list-box');
		div.style.display = 'none';
		option_display = 0;
	}
}

function hideMenu() {
	if (option_display == 1 && parent_display == 1) {
		var div = document.getElementById('option-list-box');
		div.style.display = 'none';
		option_display = 0;
	}
	parent_display = 1;
}

function showMessage() {
    document.getElementById("apply_message").style.display = "block";
    document.getElementById("apply_message_div").style.display = "block";
    //$main(".ui-dialog-titlebar").show();
    $main("#dialog-message").dialog({
        resizable : false,
        dialogClass : "no-close",
        height : 110,
        width : 310,
        modal : true,
        closeOnEscape : false,
    });
    $main(".ui-dialog-titlebar").hide();
    $main("#dialog-message").dialog({height: 110});
    //$main(".ui-widget-content").removeClass("custom-add-edit-dialog");
}

function logout() {
	window.location.href = "logout.php";
}

function hideMessage() {
    document.getElementById("apply_message").style.display = "none";
    document.getElementById("apply_message_div").style.display = "none";
    $main("#dialog-message").dialog("close");
}

function callDiagnosticsPage(cmd, host, count, pageid, ht, wt) {
	$main("#dialog-popup").html("");
	$main("#dialog-popup").load(pageid + "?cmd=" + cmd + "&host=" + host + "&count=" + count).dialog({
		modal : true,
		height : ht,
		width : wt,
		closeOnEscape : false,
		dialogClass : "no-close"
	});
	$main(".ui-dialog-titlebar").hide();
	$main(".ui-widget-content").addClass("custom-add-edit-dialog");
	try{
	$main("#dialog-popup").removeClass("ui-dialog-content");
	} catch(err) {}
}

function clearStatusInterval(){
	clearInterval(calibstatus_interval);
	calibstatus_interval=0;
}

function callCalibrationPage(pot, impd, steps, pageid, ht, wt) {
	
	calibstatus_interval=-1;
	$main("#dialog-popup").html("");
	$main(".ui-dialog-titlebar").show();
	$main("#dialog-popup").load(pageid + "?pot=" + pot + "&impd=" + impd + "&steps=" + steps).dialog({
	//$main("#dialog-popup").load("calibration-result.php?impd=" + impd + "&steps=" + steps).dialog({
		modal : true,
		height : ht,
		width : wt,
		closeOnEscape : false,
		//dialogClass : "no-close"
		buttons : [
                        {
                            id: "button-save",
                            text: "SAVE",
                            click: function() {
                                $main(this).dialog("close");
                                document.getElementById('container').contentWindow.submitData();
                                clearStatusInterval();
                            }
                        },
                        {
                            id: "button-cancel",
                            text: "CANCEL",
                            click: function() {
                                $main(this).dialog("close");
                                clearStatusInterval();
                                stopCalibration();
                            }
                        }

                ]
	});
	$main(".ui-dialog-titlebar").hide();
	$main(".ui-widget-content").addClass("custom-add-edit-dialog");
	try{
	$main("#dialog-popup").removeClass("ui-dialog-content");
	} catch(err) {}
}



function callPriStatus(spanid) {
    $main("#dialog-popup").html("");
    $main("#dialog-popup").load("pri-spans.php?SPANID=" + spanid).dialog({
        modal : true,
        height : 500,
        width : 600,
        closeOnEscape : false,
        dialogClass : "no-close"
    });
    $main(".ui-dialog-titlebar").hide();
    $main(".ui-widget-content").addClass("custom-add-edit-dialog");
    try{
    $main("#dialog-popup").removeClass("ui-dialog-content");
    } catch(err) {}
}

function callEditPage(val, pageid, ht, wt) {
	$main("#dialog-popup").html("");
	$main("#dialog-popup").load(pageid + "?trunk=" + val).dialog({
		modal : true,
		height : ht,
		width : wt,
		closeOnEscape : false,
		dialogClass : "no-close"
	});
	$main(".ui-dialog-titlebar").hide();
	$main(".ui-widget-content").addClass("custom-add-edit-dialog");
	try{
	$main("#dialog-popup").removeClass("ui-dialog-content");
	} catch(err) {}
}

function callAddPage(pageid, ht, wt) {
	$main("#dialog-popup").html("");
	$main("#dialog-popup").load(pageid).dialog({
		modal : true,
		height : ht,
		width : wt,
		closeOnEscape : false,
		dialogClass : "no-close"
	});
	$main(".ui-dialog-titlebar").hide();
	$main(".ui-widget-content").addClass("custom-add-edit-dialog");
	try{
	$main("#dialog-popup").removeClass("ui-dialog-content");
	} catch(err) {}
}

function webSettings() {
	$main("#dialog-popup").html("");
	$main("#dialog-popup").load("web-settings.php").dialog({
		modal : true,
		height : 400,
		width : 550,
		closeOnEscape : false,
		dialogClass : "no-close"
	});
	$main(".ui-dialog-titlebar").hide();
	$main(".ui-widget-content").addClass("custom-add-edit-dialog");
	try{
	$main("#dialog-popup").removeClass("ui-dialog-content");
	} catch(err) {}
}

function updateDetails(elem) {
	if (parseInt(elem.value) > 0) {
		$main("#dialog-popup").html("");
		$main("#dialog-popup").load("update-details.php").dialog({
			modal : true,
			height : 560,
			width : 600,
			closeOnEscape : false,
			dialogClass : "no-close"
		});
		$main(".ui-dialog-titlebar").hide();
		$main(".ui-widget-content").addClass("custom-add-edit-dialog");
		try{
		$main("#dialog-popup").removeClass("ui-dialog-content");
		} catch(err) {}
	}
}

var helpRef = 0;

function helpPage(val) {
    if(helpRef != 0) {
        helpRef.close();
    }
    helpRef = window.open("help?param="+val, "_blank", "height=560, width=600, resizable=1, location=0, menubar=0, titlebar=0, scrollbars=yes");
}

function closeAddEditDialog() {
	$main("#dialog-popup").dialog("close");
}

function callConfirmBox(val) {
	document.getElementById("confirmdata").style.display = "block";
	document.getElementById("confirmdata_div").style.display = "block";
	$main(".ui-dialog-titlebar").show();
	$main("#dialog-confirm").dialog({
		resizable : false,
		dialogClass : "no-close",
		height : 160,
		width : 450,
		modal : true,
		closeOnEscape : false,
		buttons : {
			"YES" : function() {
				$main(this).dialog("close");
				callDelete(1, val);
			},
			"NO" : function() {
				$main(this).dialog("close");
				callDelete(0, val);
			}
		}
	});
	$main(".ui-widget-content").removeClass("custom-add-edit-dialog");

}

function callConfirmAllBox(val) {
	document.getElementById("confirmdata").style.display = "block";
	document.getElementById("confirmdata_div").style.display = "block";
	$main(".ui-dialog-titlebar").show();
	$main("#dialog-confirm").dialog({
		resizable : false,
		dialogClass : "no-close",
		height : 160,
		width : 450,
		modal : true,
		closeOnEscape : false,
		buttons : {
			"YES" : function() {
				$main(this).dialog("close");
				callAllDelete(1, val);
			},
			"NO" : function() {
				$main(this).dialog("close");
				callAllDelete(0, val);
			}
		}
	});
	$main(".ui-widget-content").removeClass("custom-add-edit-dialog");

}

function rebootDevice() {
	document.getElementById("confirmreboot").style.display = "block";
	document.getElementById("confirmreboot_div").style.display = "block";
	$main(".ui-dialog-titlebar").show();
	$main("#dialog-reboot").dialog({
		resizable : false,
		dialogClass : "no-close",
		height : 160,
		width : 450,
		modal : true,
		closeOnEscape : false,
		buttons : {
			"YES" : function() {
				$main("#reboot-warning").hide();
				parent.window.location = 'reboot.php'
			},
			"NO" : function() {
				$main(this).dialog("close");
			}
		}
	});
	$main(".ui-widget-content").removeClass("custom-add-edit-dialog");
}

function updateDatetime() {
    document.getElementById("apply_datetime").style.display = "block";
    document.getElementById("apply_datetime_div").style.display = "block";
    $main(".ui-dialog-titlebar").show();
    $main("#dialog-datetime").dialog({
        resizable : false,
        dialogClass : "no-close",
        height : 160,
        width : 450,
        modal : true,
        closeOnEscape : false,
        buttons : {
            "YES" : { 
                      text :"OK",
                      click : function() {
                          $main(this).dialog("close");
                                       document.getElementById('container').contentWindow.submitData();  
                                         }
            },
            "NO" :{
                      text :"CANCEL",
                      click : function() {
                                         $main(this).dialog("close");
                                         }  
            }
        }
    });
    $main(".ui-widget-content").removeClass("custom-add-edit-dialog");
}

function updateSuccess() {
	document.getElementById("confirmsuccess").style.display = "block";
	document.getElementById("confirmsuccess_div").style.display = "block";
	$main(".ui-dialog-titlebar").show();
	$main("#dialog-success").dialog({
		resizable : false,
		dialogClass : "no-close",
		height : 160,
		width : 450,
		modal : true,
		closeOnEscape : false,
		buttons : {
			"OK" : function() {
				$main(this).dialog("close");
			}
		}
	});
	$main(".ui-widget-content").removeClass("custom-add-edit-dialog");
}

function applyError(val) {
	document.getElementById("apply_error").style.display = "block";
	document.getElementById("apply_error_div").style.display = "block";
	$main("#apply_error_div").html(val);
	$main(".ui-dialog-titlebar").show();
	$main("#dialog-error").dialog({
		resizable : false,
		dialogClass : "no-close",
		height : 160,
		width : 450,
		modal : true,
		closeOnEscape : false,
		buttons : {
			"Close" : function() {
				$main(this).dialog("close");
			}
		}
	});
	$main(".ui-widget-content").removeClass("custom-add-edit-dialog");
}

function applyReboot() {
	document.getElementById("apply_reboot").style.display = "block";
	document.getElementById("apply_reboot_div").style.display = "block";
	$main(".ui-dialog-titlebar").show();
	$main("#dialog-apply-reboot").dialog({
		resizable : false,
		dialogClass : "no-close",
		height : 160,
		width : 450,
		modal : true,
		closeOnEscape : false,
		buttons : {
			"OK" : function() {
				parent.window.location = 'reboot.php';
			},
			"Cancel" : function() {
				$main(this).dialog("close");
			}
		}
	});
	$main(".ui-widget-content").removeClass("custom-add-edit-dialog");
}

function applyChangesReboot() {
	document.getElementById("apply_reboot").style.display = "block";
	document.getElementById("apply_reboot_div").style.display = "block";
	$main(".ui-dialog-titlebar").show();
	$main("#dialog-apply-reboot").dialog({
		resizable : false,
		dialogClass : "no-close",
		height : 160,
		width : 450,
		modal : true,
		closeOnEscape : false,
		buttons : {
			"OK" : function() {
				$main("#reboot-warning").hide();
				parent.window.location = 'reboot.php';
			},
			"Reboot Later" : function() {
				$main.ajax({
					url : "system-calls.php?FTYPE=setrebootflag"
				}).done(function(output) {
					$main("#reboot-warning").show();
				});
				
				$main(this).dialog("close");
			}
		}
	});
	$main(".ui-widget-content").removeClass("custom-add-edit-dialog");
}

function applyUpgrade() {
	document.getElementById("upgrade_reboot").style.display = "block";
	document.getElementById("upgrade_reboot_div").style.display = "block";
	$main(".ui-dialog-titlebar").show();
	$main("#dialog-upgrade-reboot").dialog({
		resizable : false,
		dialogClass : "no-close",
		height : 160,
		width : 450,
		modal : true,
		closeOnEscape : false,
		buttons : {
			"OK" : function() {
				$main(this).dialog("close");
				document.getElementById('container').contentWindow.upgradeFirmware();
			},
			"Cancel" : function() {
				$main(this).dialog("close");
			}
		}
	});
	$main(".ui-widget-content").removeClass("custom-add-edit-dialog");
}

function applyFactoryReset() {
    document.getElementById("factory_reboot").style.display = "block";
    document.getElementById("factory_reboot_div").style.display = "block";
    $main(".ui-dialog-titlebar").show();
    $main("#dialog-factory-reboot").dialog({
        resizable : false,
        dialogClass : "no-close",
        height : 160,
        width : 450,
        modal : true,
        closeOnEscape : false,
        buttons : {
            "OK" : function() {
                $main(this).dialog("close");
                document.getElementById('container').contentWindow.factoryReset();
            },
            "Cancel" : function() {
                $main(this).dialog("close");
            }
        }
    });
    $main(".ui-widget-content").removeClass("custom-add-edit-dialog");
}

function applyRestore() {
	document.getElementById("restore_reboot").style.display = "block";
	document.getElementById("restore_reboot_div").style.display = "block";
	$main(".ui-dialog-titlebar").show();
	$main("#dialog-restore-reboot").dialog({
		resizable : false,
		dialogClass : "no-close",
		height : 160,
		width : 450,
		modal : true,
		closeOnEscape : false,
		buttons : {
			"OK" : function() {
				$main(this).dialog("close");
				document.getElementById('container').contentWindow.restoreConfig();
			},
			"Cancel" : function() {
				$main(this).dialog("close");
			}
		}
	});
	$main(".ui-widget-content").removeClass("custom-add-edit-dialog");
}

function applyNetwork() {
	document.getElementById("network_reboot").style.display = "block";
	document.getElementById("network_reboot_div").style.display = "block";
	$main(".ui-dialog-titlebar").show();
	$main("#dialog-network-reboot").dialog({
		resizable : false,
		dialogClass : "no-close",
		height : 160,
		width : 450,
		modal : true,
		closeOnEscape : false,
		buttons : {
			"YES" : function() {
				$main(this).dialog("close");
				document.getElementById('container').contentWindow.submitData();
			},
			"NO" : function() {
				$main(this).dialog("close");
			}
		}
	});
	$main(".ui-widget-content").removeClass("custom-add-edit-dialog");
}

function applyUtilities(val) {
	document.getElementById("utilities").style.display = "block";
	document.getElementById("utilities_div").style.display = "block";
	$main(".ui-dialog-titlebar").show();
	$main("#dialog-utilities").dialog({
		resizable : false,
		dialogClass : "no-close",
		height : 160,
		width : 450,
		modal : true,
		closeOnEscape : false,
		buttons : {
			"YES" : function() {
				$main(this).dialog("close");
				document.getElementById('container').contentWindow.callUtilities(val);
			},
			"NO" : function() {
				$main(this).dialog("close");
			}
		}
	});
	$main(".ui-widget-content").removeClass("custom-add-edit-dialog");
}

$main(function() {
	$main("#accordion").accordion({
		heightStyle : "content"
	});
});

function callDelete(val, deletetoken) {
	if (val == 1) {
		document.getElementById('container').contentWindow.deleteAction(val, deletetoken);
	}
}

function callAllDelete(val, deletetoken) {
	if (val == 1) {
		document.getElementById('container').contentWindow.deleteAllAction(val, deletetoken);
	}
}

function helpTooltip() {
	$main(".btn-top").tooltip({
		show : null,
		position : {
			my : "left top",
			at : "left bottom"
		},
		open : function(event, ui) {
			ui.tooltip.animate({
				top : ui.tooltip.position().top + 10
			}, "fast");
		}
	});
}

function refreshFrame() {
	document.getElementById("container").src = document.getElementById("container").src;
}


function setUpdateValue(val) {
	if (parseInt(val) == 0) {
		$main("#applychanges").attr("class", "apply-changes-disable");
	} else {
		$main("#updates").css("display", "block");
		$main("#applychanges").attr("class", "apply-changes");
	}
	$main("#updates").val(val);
}

function setUpdates(elem) {
	if(elem.className != "apply-changes-disable") {
		$main("#applychanges").css("display", "none");
		$main("#applychangessaving").css("display", "block");
		$main.ajax({
			url : "../Model/apply_changes.php"
		}).done(function(output) {
			// string format "0","SUCCESS/FAILURE","ERROR/NO_ERROR","YES/NO" [update count, apply status, error msg, reboot required]
			//output = "0,SUCCESS,Error,NO";
			var resp = output.split("<OUTPUT>");
			var response = resp[1].split(",");
			if (response[1] == "FAILURE") {
				applyError(response[2]);
				$main("#updates").val(parseInt(response[0]));
				$main("#applychangessaving").css("display", "none");
				$main("#applychanges").css("display", "block");
			} else if (response[1] == "SUCCESS") {
				$main("#updates").css("display", "none");
				$main("#applychangessaving").css("display", "none");
				$main("#applychanges").css("display", "block");
				$main("#applychanges").attr("class", "apply-changes-disable");
				if (response[3] == "YES") {
					applyChangesReboot();
				} else {
					updateSuccess();
				}
			}
			//alert(response[0]+":"+response[1]+":"+response[2]+":"+response[3]);
		});
	}
}

function checkAsteriskStatus() {
	$main.ajax({
		url : "system-calls.php?FTYPE=checkStatus"
	}).done(function(output) {
		var data_array = output.split("<CHECKSTATUS>");
		$main("#ast_status").html(data_array[1]);
		if (data_array[1] == "Connected") {
			$main("#ast-status-img").attr("src", "images/icn-e1t1-ch-status-green.gif");
		} else {
			$main("#ast-status-img").attr("src", "images/icn-e1t1-ch-status-red.gif");
		}
		
	});
}


$main(document).ready(function() {
	/*
	if (card_install_flag == 0) {
		document.getElementById("container").src = "card-install.php";
	} else {
		document.getElementById("container").src = "dashboard.php";
	}*/
	document.getElementById("container").src = "dashboard";
	setTitleFooter();
});
