
#ifndef CFGPARSER_H
#define CFGPARSER_H 

void loadDefParams(LDRConf *ldrconf);
//int writeCalibData(char *Fname,unsigned int steps);
int readCalibData(char *Fname); 
int writeLDRConfig(char **argc);
int readParseCfg(LDRConf *ldrconf);

#endif
