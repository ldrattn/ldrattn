import os.path
import csv

ldrconf = "/usr/local/etc/ldrattn/ldrattn.conf" 
calibconf = "/usr/local/etc/ldrattn/calibration.conf"
savedcsvdir = "/usr/local/etc/ldrattn/csv/"

#defVolume=15
#impedance=10
#calibSteps=48
#balance=1
#balValue=1
#temperature=1


ldrconfdata = {}
calibdata = {}
savedcalibinfo = {}

def load_default_dashboard_data():
	ldrconfdata['impedance'] = '20'
        ldrconfdata['temperature'] = 0
        ldrconfdata['balance'] = 0
        ldrconfdata['balValue'] = 0
        ldrconfdata['defVolume'] = 30
	ldrconfdata['impedanceval'] = '20'
        ldrconfdata['calibSteps'] = 48
        ldrconfdata['temp_calib'] = 26

def load_default_calib_data():
	calibdata['pot']= '10'
	calibdata['impedanceval'] = 10
        calibdata['calibsteps'] = 48
        calibdata['customsteps'] = "no"

def update_calib_info(pot, data):
	csvfile = savedcsvdir + pot + "k.csv" 
	if os.path.isfile(csvfile):
		with open(csvfile) as f:
			reader = csv.reader(f)
			row1 = next(reader)
			data['impedanceval'] = row1[0]
			data['calibSteps'] = row1[1]
			data['temp_calib'] = row1[2]
	return data
	

def get_dashboard_data():
	load_default_dashboard_data()

	with open(ldrconf) as ldrfile:
		for line in ldrfile:
			name, var = line.partition("=")[::2]
			ldrconfdata[name.strip()] = var.strip()

	update_calib_info(ldrconfdata['impedance'], ldrconfdata)
	return ldrconfdata;

def get_calib_data():
	load_default_calib_data()
	if os.path.isfile(calibconf):
		with open(calibconf) as calibfile:
			for line in calibfile:
				name, var = line.partition("=")[::2]
				calibdata[name.strip()] = var.strip()
	return calibdata;
	

def save_calib_info(request):
	calibdata['pot'] = request.form["CPVALUE"] 
	calibdata['impedanceval'] = int(request.form["CUST_VAL"])
        calibdata['calibsteps'] = int(request.form["STPS"])
        calibdata['customsteps'] = request.form["STP_OPT"]
	with open(calibconf, "w") as file:
		for key,value in calibdata.items():
			file.write("%s = %s\n" % (key, value))
	
	return calibdata

def get_savedcalibdata(pot):
	csvfile = savedcsvdir + pot + "k.csv" 
	if os.path.isfile(csvfile):
		with open(csvfile) as f:
			reader = csv.reader(f)
			row1 = next(reader)
			data = list(reader)
	return data 

def get_savedcalibinfo(val):
	savedcalibinfo['pot'] = val 
	update_calib_info(val, savedcalibinfo)
	return savedcalibinfo
