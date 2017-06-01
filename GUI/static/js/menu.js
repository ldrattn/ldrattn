/*var menu_tabs = ["dashboard", "ami-config", "isdnpri-config", "isdnpri-status", "card-install", "module-options", "re-install"];
var menu_pages = ["dashboard.php", "ami-config.php", "isdnpri-config.php", "isdnpri-status.php", "card-install.php", "module-options.php", "card-reinstall.php"];
*/
var menu_tabs = ["home", "calibration", "monitor", "saved-values"];
var menu_pages = ["dashboard","calibration", "monitor","saved-values"];

function setTabs(val) {
    for (var i = 0; i < menu_tabs.length; i++) {
        if (menu_tabs[i] == val) {
            $main("#" + menu_tabs[i]).attr("class", "tabsetupselected");
            document.getElementById("container").src = "../" + menu_pages[i];
        } else {
            $main("#" + menu_tabs[i]).attr("class", "tabsetup");
        }
    }
}

function setArrow(val) {
    for (var i = 0; i < menu_tabs.length; i++) {
        if (menu_tabs[i] == val) {
            $main("#" + menu_tabs[i] + "-arrow").css("display", "block");
        } else {
            $main("#" + menu_tabs[i] + "-arrow").css("display", "none");
        }
    }
}

function openPageTab(val) {
    setTabs(val);
    setArrow(val);
}
