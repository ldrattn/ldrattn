#ifndef LDRATTNAPP_H 
#define LDRATTNAPP_H

#define VOL_MAX_STEP 100     //** maximum volume steps; range: 20...80. Higher = more memory usage
#define MAXLEN 80
#define DBMAX 48
#define MUTE 0 

#define MIN_VOLUME_STEPS 48     //** minimum volume steps; 
typedef enum { CALIBRATED, NOTCALIBRATED } Calibstate;
typedef enum { CALIB_START, CALIB_ONGOING,CALIB_SUCCESS,CALIB_FAILED} Calibstatus;

typedef struct {
	unsigned int pw_SE;            // series
	unsigned int pw_SH;            // shunt
	unsigned int i_SE;            // current series 
	unsigned int i_SH;            // current shunt
} LDRdata;

typedef struct {
	unsigned int series;
	unsigned int shunt;
} LDRtargetres;

typedef struct {
	LDRdata dataL[VOL_MAX_STEP - 2];
	LDRdata dataR[VOL_MAX_STEP - 2];
	LDRtargetres targetres[VOL_MAX_STEP - 2];
	unsigned int ldrTemp;      //
	unsigned int potImpedence;
	unsigned int calibSteps;
}LDRAttr;

extern LDRAttr ldrattn;
//extern LDRdata dataL[VOL_MAX_STEP - 2]; // left channel
//extern LDRdata dataR[VOL_MAX_STEP - 2]; // right channel
//extern unsigned int Temp;
//extern unsigned int Impedance;


struct volumeattr {
	int volume;
	int balanceChan;
	int balanceValue;
};

struct calibattr {
	unsigned int impedance;
	int numsteps;
	int volume;
	int status;
	int pipefd;
	int shstep;
	int sestep;
};

//extern unsigned int defVolume;
//extern unsigned int impedance;
//extern unsigned int calibSteps;
typedef struct {
	unsigned int volume;
	unsigned int impedance;
	unsigned int calibSteps;
	unsigned int balanceChan; 
	unsigned int balanceValue; 
	unsigned int deltaTemp; 
}LDRConf;
 
extern LDRConf ldrconf; 

int readCalibData(char *); 
void setVolume(int );
//int doCalibration(unsigned int ,int ,int ); 
void loadDefparams(void);
int readParseCfg(void);

#endif 
