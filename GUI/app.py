from flask import Flask, render_template, request, Response
import daccess
import action
import time

app = Flask(__name__)


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
	return render_template('dashboard.html', ldrdata=data)

@app.route("/calibration", methods=['GET', 'POST'])
def calibration():
	if request.method == 'GET':
		data = daccess.get_calib_data() 
		data['refresh'] = 0
		data['running'] = action.is_calibration_running()
	if request.method == 'POST':
		data = daccess.save_calib_info(request)
		action.save_calib_data(data)
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
	return render_template('monitor.html')

@app.route("/saved-values")
def savedvalues():
	pot = request.args.get('POT')
	
	if (pot is None):
		pot="10"
	info= daccess.get_savedcalibinfo(pot)

	data= daccess.get_savedcalibdata(pot)


	return render_template('saved-values.html', saveddata=data, calibinfo=info)


@app.route("/help")
def help():
	return render_template('help.html')


if __name__ == "__main__":
	app.run(host="0.0.0.0", port=5001, debug=True)
