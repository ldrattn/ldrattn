from flask import Flask, render_template, request, Response
import daccess
import action
import time
import sys
import subprocess
from time import sleep

app = Flask(__name__)

#fh = open('/var/log/asterisk/messages')
ff = "/var/log/ldrattnapp.log"
sysfile = "/var/log/syslog"


@app.route("/")
def main():
	return render_template('index.html')

@app.route("/dashboard", methods=['GET', 'POST'])
def dashBoard():
	if request.method == 'GET':
		pot = request.args.get('PVALUE')
		data = daccess.get_dashboard_data() 
		if (not pot is None):
			data = daccess.update_calib_info(pot, data) 
			data['impedance'] = pot
	if request.method == 'POST':
		action.save_dashboard_data(request)
		action.reload_ldr()
		data = daccess.get_dashboard_data() 
	potactive = daccess.get_active_pot_file()
	return render_template('dashboard.html', ldrdata=data, potactive=potactive)

@app.route("/calibration", methods=['GET', 'POST'])
def calibration():
	if request.method == 'GET':
		data = daccess.get_calib_data() 
		data['refresh'] = 0
		data['running'] = action.is_calibration_running()
	if request.method == 'POST':
		data = daccess.save_calib_info(request)
		data1 = daccess.get_dashboard_data()
		pot = data['pot']
		daccess.delete_custom_file(pot)
		action.save_calib_data(data)

		if data['impedanceval'] == data1['impedanceval']:
			action.reload_ldr()
		
		data = daccess.get_calib_data() 
		data['refresh'] = 1

	return render_template('calibration.html', calibdata=data)
	

@app.route("/calibrationresult")
def calibration_result():
	if request.method == 'GET':
		data = daccess.get_calib_data() 
		data['pot'] = request.args.get('pot')
		data['impedanceval'] = request.args.get('impd')
		data['calibsteps'] = request.args.get('steps')
		data['running'] = action.is_calibration_running() 
	return render_template('calibration-result.html', calibdata=data)


@app.route("/system-calls")
def system_calls():
	ftype = request.args.get('FTYPE')
	if (ftype == "CALIBRATION"):
		pot = request.args.get('POT')
		impval = int(request.args.get('IMPEDANCE'))
		steps = int(request.args.get('STEPS'))
		ret = action.start_calibration(pot, impval, steps)
		if (ret == 0):
			return "Calibration Started Successfully..!!!"
	if (ftype == "CALIBSTATUS"):
		pot = request.args.get('POT')
		result = action.calibration_status(pot)
		return Response(result, mimetype='text/plain') 
	if (ftype == "STOPCALIBRATION"):
		pot = request.args.get('POT')
		result = action.stop_calibration(pot)
		return "Calibration stoped..!!!"

	return "In system calls..!!!"

@app.route("/monitor")
def monitor():
	data = daccess.get_dashboard_data()
	return render_template('monitor.html', ldrdata=data)

def monitor_syslog(filename,linesback,returnlist):

	avgcharsperline=75
	file = open(filename,'r')
	while 1:
		try: file.seek(-1 * avgcharsperline * linesback,2)
	        except IOError: file.seek(0)
	        if file.tell() == 0: atstart=1
	        else: atstart=0

	        lines=file.read().split("\n")
	        if (len(lines) > (linesback+1)) or atstart: break
        #The lines are bigger than we thought
	        avgcharsperline=avgcharsperline * 1.3 #Inc avg for retry
	file.close()

	if len(lines) > linesback: start=len(lines)-linesback -1
	else: start=0
	if returnlist: return lines[start:len(lines)-1]

	out=""
	for l in lines[start:len(lines)-1]: out=out + l + "\n"
	return out


@app.route("/syslog-read")
def syslogfileread():
	#data = log_generate()
	data = monitor_syslog(sysfile,100,0)
	return Response(data , mimetype='text/plain') 


def tail_lines(filename,linesback,returnlist):

	avgcharsperline=75
	file = open(filename,'r')
	while 1:
		try: file.seek(-1 * avgcharsperline * linesback,2)
	        except IOError: file.seek(0)
	        if file.tell() == 0: atstart=1
	        else: atstart=0

	        lines=file.read().split("\n")
	        if (len(lines) > (linesback+1)) or atstart: break
        #The lines are bigger than we thought
	        avgcharsperline=avgcharsperline * 1.3 #Inc avg for retry
	file.close()

	if len(lines) > linesback: start=len(lines)-linesback -1
	else: start=0
	if returnlist: return lines[start:len(lines)-1]

	out=""
	for l in lines[start:len(lines)-1]: out=out + l + "\n"
	#print out
	return out
	

@app.route("/log-stream")
def logfilestream():
	#data = log_generate()
	data = tail_lines(ff,100,0)
	return Response(data , mimetype='text/plain') 

@app.route("/log-file")
def logfile():
	#data = daccess.read_activelogfile()
	return render_template('log-file.html')


@app.route("/saved-values")
def savedvalues():
	pot = request.args.get('POT')
	
	if (pot is None):
		pot="10"
	info = daccess.get_savedcalibinfo(pot)

	data = daccess.get_savedcalibdata(pot)
	
	potactivelist = daccess.get_active_pot_file()
	
	return render_template('saved-values.html', saveddata=data, calibinfo=info, potactivelist=potactivelist)


@app.route("/help")
def help():
	return render_template('help.html')


if __name__ == "__main__":
	app.run(host="0.0.0.0", port=5001, debug=True)
