
#ifndef CFGPARSER_H
#define CFGPARSER_H 

void loadDefParams();
//int writeCalibData(char *Fname,unsigned int steps);
int readCalibData(char *Fname); 
int writeLDRConfig(unsigned int steps,unsigned int impedance,unsigned int volume,unsigned int balancechan,unsigned int balancevalue,unsigned int temp);

#endif
