
#ifndef CFGPARSER_H
#define CFGPARSER_H 

void loadDefParams();
//int writeCalibData(char *Fname,unsigned int steps);
int readCalibData(char *Fname); 
int writeLDRConfig(char **argc);

#endif
