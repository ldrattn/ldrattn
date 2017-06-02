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
static int cmdParser(char *clientcmd,int sockfd);
static void startCalibrationThread(unsigned int ,int ,int);
static void stopCorrectionThread(void);
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
struct calibattr calibdata;
int pipefd[2];

Calibstate State;
	
pthread_t deltaThread;
pthread_t calibThread;
void deltaCorrection(struct volumeattr *);
int doCalibration(struct calibattr *);

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
		setMute();
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

static void startCalibrationThread(unsigned int impedance,int numsteps,int volume)
{
	int ret;

	memset(&calibdata,0,sizeof(calibdata));
	calibdata.impedance = impedance;
	calibdata.numsteps = numsteps;
	calibdata.volume = volume;
	calibdata.status = CALIB_START;
	calibdata.pipefd = pipefd[1];
	calibdata.shstep = 0;
	calibdata.sestep = 0;

	ret = pthread_create(&calibThread,NULL,(void *)doCalibration,(void *)&calibdata);
	//pthread_join(calibThread,(void *)&ret);		

	if(ret == 0) {
		LOG_TRACE(LOG_INFO,"Calibrartion thread created\n");
		//State = CALIBRATED;	
		//curImpedance = argvalue;
		//curVolume = ldrconf.volume;
		//startCorrectionThread();		

	} else {
		LOG_TRACE(LOG_INFO,"Failed  to create the calibration thread \n");
		//State = NOTCALIBRATED;	
		calibdata.status = CALIB_FAILED;
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

static void stopCalibrationThread()
{
	int ret;

	ret = pthread_cancel(calibThread);
 	if(ret)
		LOG_TRACE(LOG_INFO,"Failed to Cancel Calibration thread\n");
}

static int cmdParser(char *clientcmd,int sockfd)
{
	unsigned int argvalue;	
	unsigned int calibsteps;
	char respbuf[MAXLEN];

	if(!strlen(clientcmd))
		return EXIT_FAILURE;
	char *argc[MAX_ARG];
	int argcnt = 0;
	argc[argcnt] = strtok(clientcmd," ");
	while((argc[argcnt++] != NULL) && (argcnt < MAX_ARG)) {
		
		argc[argcnt] = strtok(NULL," ");
	}

	argcnt = 0;
	if(!strncmp(argc[argcnt],"CALIB_START",strlen(argc[argcnt]))) { 
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
		startCalibrationThread(argvalue,calibsteps,ldrconf.volume);
#if 0
		if(!doCalibration(argvalue,calibsteps,ldrconf.volume)) {
		if(!startCalibration(argvalue,calibsteps,ldrconf.volume)) {
			State = CALIBRATED;	
			curImpedance = argvalue;
			curVolume = ldrconf.volume;
			startCorrectionThread();		
		} else {
			State = NOTCALIBRATED;	

		}
#endif 
	} else if(!strncmp(argc[argcnt],"CALIB_STOP",strlen(argc[argcnt]))) {
		//Todo how to stop calibration
		stopCalibrationThread();
		startCorrectionThread();		
	
	} else if(!strncmp(argc[argcnt],"SET_VOLUME",strlen(argc[argcnt])) && (State == CALIBRATED)) {
		stopCorrectionThread();
		argvalue = atoi(argc[++argcnt]);
		attr.balanceChan = 0;
		attr.balanceValue = 0;
		setVolume(argvalue);
		curVolume = argvalue;
		if((curVolume != 0) &&  (curVolume < (ldrconf.calibSteps - 1))) {
		startCorrectionThread();		
		}
		//set volume
	} else if(!strncmp(argc[argcnt],"RELOAD_CONFIG",strlen(argc[argcnt]))) {
		memset(&ldrattn,0,sizeof(ldrattn));
		setMute();
		readLDRConfig();
		State = NOTCALIBRATED;	
		//reload config

	} else if(!strncmp(argc[argcnt],"CALIB_SAVE",strlen(argc[argcnt])) && (State == CALIBRATED)) {
		if(saveCalibration(calibdata.impedance,calibdata.numsteps) == EXIT_FAILURE) {
		//if(saveCalibration(curImpedance,ldrconf.calibSteps) == EXIT_FAILURE) //{
			debugLog(LOG_INFO, "Failed to Save Calibrated Data \n");
		} else {  
			memset(&calibdata,0,sizeof(calibdata));
		}		 
		//save calibration

	} else if(!strncmp(argc[argcnt],"WRITE_CONFIG",strlen(argc[argcnt]))) {
		//write to config file
		//writeLDRConfig(atoi(argc[++argcnt]),atoi(argc[++argcnt]),atoi(argc[++argcnt]),atoi(argc[++argcnt]),atoi(argc[++argcnt]),atoi(argc[++argcnt]));
		writeLDRConfig(atoi(argc[1]),atoi(argc[2]),atoi(argc[3]),atoi(argc[4]),atoi(argc[5]),atoi(argc[6]));
		stopCorrectionThread();
		readLDRConfig();
		State = NOTCALIBRATED;	

	} else if(!strncmp(argc[argcnt],"BALANCE_UPDATE",strlen(argc[argcnt])) && (State == CALIBRATED)) {
		attr.balanceChan = atoi(argc[++argcnt]);
		attr.balanceValue = atoi(argc[++argcnt]);
		stopCorrectionThread();
		startCorrectionThread();		
		
	
	} else if(!strncmp(argc[argcnt],"TEMP_COMPENSATE",strlen(argc[argcnt])) && (State == CALIBRATED)) {
		//Todo do the DAC correction based on the previous values
		argvalue = atoi(argc[++argcnt]);

	} else if(!strncmp(argc[argcnt],"MUTE_VOLUME",strlen(argc[argcnt]))) {
		LOG_TRACE(LOG_INFO," Mute volume from client\n");		 			
		stopCorrectionThread();
		setMute();
		 
	} else if(!strncmp(argc[argcnt],"CALIB_STATUS",strlen(argc[argcnt]))) {
		LOG_TRACE(LOG_INFO,"Calib Status from client\n");
		snprintf(respbuf,MAXLEN,"%d,%d,%d,%d,%d",calibdata.impedance,calibdata.numsteps,calibdata.status,calibdata.sestep,calibdata.shstep);
		printf("calibstatus is %s\n",respbuf);
		send(sockfd,respbuf,strlen(respbuf),0);		 			
		 
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
	char Cmd[CMDLEN];
	fd_set Readfds;
	int Maxfds;
	char IPCdata;

	State = NOTCALIBRATED;

	openLog();	
	
	if(initWiringPiDevices() != EXIT_SUCCESS){
		LOG_TRACE(LOG_INFO,"  Failed to initialise the I2C transaction \n");
		exit(1);
	}
	if(!testSetup()) {
		LOG_TRACE(LOG_INFO,"  Failed to initialise the ADC/DAC  transaction \n");
		exit(1);

	}
	readLDRConfig();
	
	if(pipe(pipefd) < 0) {
		LOG_TRACE(LOG_INFO,"  Failed to create pipe fd for IPC \n");
		exit(1);		
	}
			
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
	
		FD_ZERO(&Readfds);
		FD_SET(Sock,&Readfds);
		Maxfds = Sock;
	
		if(pipefd[0] > 0) {
			FD_SET(pipefd[0],&Readfds);
		}
			
		if( pipefd[0] > Maxfds) {
			Maxfds = pipefd[0];	
		}
		
		printf("Waiting for a connection... %d %d %d\n",Sock,pipefd[0],Maxfds);
		select(Maxfds+1, &Readfds, NULL, NULL, NULL);	
		if(FD_ISSET(Sock,&Readfds)) {
			Len = sizeof(Remote);
			if ((LDRSock = accept(Sock, (struct sockaddr *)&Remote, &Len)) == -1) {
				perror("accept");
				exit(1);
			}	
			recv(LDRSock, Cmd, 80, 0);
			printf("the command received is %s \n",Cmd);
			cmdParser(Cmd,LDRSock);
			printf("Connected. %s\n",Cmd);
			close(LDRSock);
		} 
		if(FD_ISSET(pipefd[0],&Readfds)) {
			read(pipefd[0],&IPCdata,1);
			printf("starting correction thread \n");
			startCorrectionThread();		
		} 
		
	}

	close(LDRSock);
	close(Sock);
	closeLog();
	return 0;
}

