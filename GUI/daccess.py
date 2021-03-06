import os.path
import csv
from os import listdir
import re

ldrconf = "/usr/local/etc/ldrattn/ldrattn.conf" 
calibconf = "/usr/local/etc/ldrattn/calibration.conf"
savedcsvdir = "/usr/local/etc/ldrattn/csv/"
potlist = [ "10", "30", "60", "80" ]


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

def get_pot_file(pot):
	if(pot=="Custom"):
		for f in listdir(savedcsvdir):
			f = re.sub(r'\k.csv$', '', f)
			
			if f not in potlist:
				pot = f

	return savedcsvdir + pot + "k.csv" 

def get_active_pot_file():
	uuidArray = []
	for f in listdir(savedcsvdir):
		f = re.sub(r'\k.csv$', '', f)
		uuidArray.append(f)
	return uuidArray
	
def delete_custom_file(pot):
	if(pot=="Custom"):
		csvfile = get_pot_file(pot)	
		os.remove(csvfile)


def update_calib_info(pot, data):
	csvfile = get_pot_file(pot)
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
	if ldrconfdata['impedance'] not in potlist:
		ldrconfdata['impedance'] = "Custom"
		ldrconfdata['potlist'] = potlist
		 
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
	data = {}
	csvfile = get_pot_file(pot)
	if os.path.isfile(csvfile):
		with open(csvfile) as f:
			reader = csv.reader(f)
			row1 = next(reader)
			data = list(reader)
	return data 

def read_activelogfile():
	data = {}
	fname = "/tmp/ldrattnapp.log"
	#with open("/tmp/text.log", "r") as ins:
    	#	array = []
    	#		array.append(line)
	#		print array
	with open(fname) as f:
    		data = f.read().splitlines()
		#print data
	return data

def get_savedcalibinfo(val):
	savedcalibinfo['pot'] = val 
	update_calib_info(val, savedcalibinfo)
	return savedcalibinfo
