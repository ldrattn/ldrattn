#include <stdio.h>
#include <stdlib.h>
#include <fcntl.h>
#include <syslog.h>
#include <errno.h>
#include <string.h>
#include <unistd.h>
#include <pthread.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <sys/un.h>
#include "ldrattnapp.h"
#include "debug.h"
#include "logger.h"
#include "cfgparser.h"
#include "csvparser.h"
#include "actiondef.h"

static void printCalibData();
static void readLDRConfig();
static int cmdParser(char *clientcmd);
static void startCorrectionThread(void);
static void stopCorrectionThread(void);

#define SOCK_PATH "/usr/local/etc/ldrattn/echo_socket"
#define CMDLEN 32
#define MAX_ARG 7
#define DEBUG 1

LDRAttr ldrattn;
LDRConf ldrconf;

unsigned int curVolume;
unsigned int curImpedance; //curImpedance will be changed based on the callibrartion
			    //customer may do calibrartion for different impedance 	

struct volumeattr attr;
Calibstate State;
	
pthread_t deltaThread;
void deltaCorrection(struct volumeattr *);

static void printCalibData()
{

#ifdef DEBUG
	int db;
	for(db =0 ;db < 22;db++) {
		printf(" %d  %d  %d  %d  %d  %d  %d  %d  %d %d \n",ldrattn.dataR[db].pw_SE,ldrattn.dataR[db].pw_SH,ldrattn.dataR[db].i_SE,ldrattn.dataR[db].i_SH,ldrattn.dataL[db].pw_SE,ldrattn.dataL[db].pw_SH,ldrattn.dataL[db].i_SE,ldrattn.dataL[db].i_SH,ldrattn.targetres[db].series, ldrattn.targetres[db].shunt);
		printf("\n");		
	
	}
#endif	

}

static void readLDRConfig()
{
	char csvfile[MAXLEN];

	loadDefParams();		
	if(readParseCfg() != EXIT_SUCCESS){
		debugLog(LOG_INFO, "Failed to Read Config file,so loading default values\n");
	}
	LOG_TRACE(LOG_INFO,"the config values %d %d %d\n",ldrconf.volume,ldrconf.impedance,ldrconf.calibSteps);		 			
	curVolume = ldrconf.volume;
	curImpedance = ldrconf.impedance;

	memset(csvfile,'\0',MAXLEN);
	getCSVFilename(ldrconf.impedance,csvfile);

	if(readCalibData(csvfile) == EXIT_SUCCESS) {
		
		printCalibData();
		setVolume(curVolume);
		startCorrectionThread();		
		State = CALIBRATED;
		LOG_TRACE(LOG_INFO,"Read Calibrated Data \n");		 			
	} else {
		LOG_TRACE(LOG_INFO,"Failed to Read Calibrated Data Maybe calibrration not done\n");
		//we are check for file size null. csv format cheking should be done on GUI side while
		//uploading .
		debugLog(LOG_INFO, "Failed to Read Calibrated Data Maybe calibrration not done\n");
		State = NOTCALIBRATED;
	}
}

static void startCorrectionThread()
{
	int ret;

	attr.volume = curVolume;

	ret  = pthread_create(&deltaThread,NULL,(void *)deltaCorrection,(void *)&attr);
	if(ret == 0){
		LOG_TRACE(LOG_INFO,"Created Delta correction thread\n");
	} else {
		LOG_TRACE(LOG_INFO,"Failed to Create Delta correction thread\n");
		//todo what to do if it fails to create the thread
	}
}

static void stopCorrectionThread()
{
	int ret;

	ret = pthread_cancel(deltaThread);
 	if(ret)
		LOG_TRACE(LOG_INFO,"Failed to Cancel Delta correction thread\n");
}

static int cmdParser(char *clientcmd)
{
	unsigned int argvalue;	
	unsigned int calibsteps;

	if(!strlen(clientcmd))
		return EXIT_FAILURE;
	char *argc[MAX_ARG];
	int argcnt = 0;
	argc[argcnt] = strtok(clientcmd," ");
	while((argc[argcnt++] != NULL) && (argcnt < MAX_ARG)) {
		
		argc[argcnt] = strtok(NULL," ");
	}

	argcnt = 0;
	if(!strncmp(argc[argcnt],"START_CALIB",strlen(argc[argcnt]))) { 
		//Todo call stop calibration
		//stop thread
		stopCorrectionThread();
		//do calibration
		argvalue = atoi(argc[++argcnt]);
		switch(argvalue) {
			case 10:
			case 30:
			case 50:
			case 80:
				break;
			default:
				argvalue = 0;

		} 
		calibsteps = atoi(argc[++argcnt]);
		ldrconf.calibSteps = calibsteps;
		//Todo de we need to set the volume to default volume or current volume after calibration	
		stopCorrectionThread();
		if(!doCalibration(argvalue,calibsteps,ldrconf.volume)) {
			State = CALIBRATED;	
			curImpedance = argvalue;
			curVolume = ldrconf.volume;
			startCorrectionThread();		
		} else {
			State = NOTCALIBRATED;	

		}
	} else if(!strncmp(argc[argcnt],"STOP_CALIB",strlen(argc[argcnt]))) {
		//Todo how to stop calibration
	
	} else if(!strncmp(argc[argcnt],"SET_VOLUME",strlen(argc[argcnt])) && (State == CALIBRATED)) {
		stopCorrectionThread();
		argvalue = atoi(argc[++argcnt]);
		attr.balanceChan = 0;
		attr.balanceValue = 0;
		setVolume(argvalue);
		curVolume = argvalue;
	//	if(curVolume != 0) {
		startCorrectionThread();		
	//	}
		//set volume
	} else if(!strncmp(argc[argcnt],"RELOAD_CONFIG",strlen(argc[argcnt]))) {
		readLDRConfig();
		State = NOTCALIBRATED;	
		//reload config

	} else if(!strncmp(argc[argcnt],"SAVE_CALIB",strlen(argc[argcnt]))) {
		if(saveCalibration(curImpedance,ldrconf.calibSteps) == EXIT_FAILURE) {
			debugLog(LOG_INFO, "Failed to Save Calibrated Data \n");
		}
		//save calibration

	} else if(!strncmp(argc[argcnt],"WRITE_CONFIG",strlen(argc[argcnt]))) {
		//write to config file
		//writeLDRConfig(atoi(argc[++argcnt]),atoi(argc[++argcnt]),atoi(argc[++argcnt]),atoi(argc[++argcnt]),atoi(argc[++argcnt]),atoi(argc[++argcnt]));
		writeLDRConfig(atoi(argc[1]),atoi(argc[2]),atoi(argc[3]),atoi(argc[4]),atoi(argc[5]),atoi(argc[6]));
		stopCorrectionThread();
		readLDRConfig();
		State = NOTCALIBRATED;	

	} else if(!strncmp(argc[argcnt],"BALANCE_UPDATE",strlen(argc[argcnt]))) {
		attr.balanceChan = atoi(argc[++argcnt]);
		attr.balanceValue = atoi(argc[++argcnt]);
		stopCorrectionThread();
		startCorrectionThread();		
		
	
	} else if(!strncmp(argc[argcnt],"TEMP_COMPENSATE",strlen(argc[argcnt]))) {
		//Todo do the DAC correction based on the previous values
		argvalue = atoi(argc[++argcnt]);
		 
	} else {
		LOG_TRACE(LOG_INFO,"  Invalid command received from clieint\n");		 			
	}
	
	return EXIT_SUCCESS;
}


int main()
{
 
	unsigned int Sock, LDRSock;
	struct sockaddr_un Local, Remote;
	socklen_t Len;
	char cmd[CMDLEN];

	State = NOTCALIBRATED;

	openLog();	
	
	if(openLDRDev() == EXIT_FAILURE) {
		debugLog(LOG_INFO, "Failed to open LDR device. check the drivers are loaded\n");
		exit(1);		
	}
	readLDRConfig();
	
			
#if 1	
	if ((Sock = socket(AF_UNIX, SOCK_STREAM, 0)) == -1) {
		perror("socket");
		exit(1);
	}

	Local.sun_family = AF_UNIX;
	strcpy(Local.sun_path, SOCK_PATH);
	unlink(Local.sun_path);
	Len = strlen(Local.sun_path) + sizeof(Local.sun_family);
	if (bind(Sock, (struct sockaddr *)&Local, Len) == -1) {
		perror("bind");
		exit(1);
	}

	if (listen(Sock, 1) == -1) {
		perror("listen");
		exit(1);
	}
	
	for(;;) {
		printf("Waiting for a connection...\n");
		Len = sizeof(Remote);
		if ((LDRSock = accept(Sock, (struct sockaddr *)&Remote, &Len)) == -1) {
			perror("accept");
			exit(1);
		}	
		recv(LDRSock, cmd, 80, 0);
		printf("the command received is %s \n",cmd);
		cmdParser(cmd);
		printf("Connected. %s\n",cmd);
		close(LDRSock);
	}

	close(LDRSock);
	close(Sock);
#endif
	closeLog();
	return 0;
}

