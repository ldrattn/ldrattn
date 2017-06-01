import subprocess
import os.path
import time
import re


calib_csv_path = "/usr/local/etc/ldrattn/csv/"
calib_status_path = "/usr/local/etc/ldrattn/status/"

def save_dashboard_data(request):
	impedance = request.form["PVALUE"]
        temp_comp = request.form["TEMP"]
        balValue = int(request.form["bal_slide"])
        defVolume = int(request.form["vol_slide"])

	if ( balValue < 0 ):
        	balance = 0
	else:
		balance = 1

	balValue = abs(balValue)

	command = "client -W -i %s -t %s -c %d -b %d -v %d" % (impedance, temp_comp, balance, balValue, defVolume)
	print command

	p = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
	for line in p.stdout.readlines():
	    print line,
	retval = p.wait()
	return 0;


def start_calibration(pot, impval, steps):
	
	command = "client -C -i %d -s %d" % (impval, steps)
	print command

	p = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
	for line in p.stdout.readlines():
	    print line,
	retval = p.wait()
	return retval;


def calibration_status(pot):

	command = "client -P"
	print command
	response = "No response"

	p = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
	for line in p.stdout.readlines():
	    	print line,
		if(re.match("Response:", line)):
			response = line
	retval = p.wait()
	
	return response 

def stop_calibration(pot):
	
	command = "client -O"
	print command

	p = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
	for line in p.stdout.readlines():
	    print line,
	retval = p.wait()
	return retval;



def save_calib_data(calibinfo):
	
	command = "client -S"
	print command

	p = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
	for line in p.stdout.readlines():
	    print line,
	retval = p.wait()
	return retval;