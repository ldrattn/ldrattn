#ifndef CSVPARSER_H 
#define CSVPARSER_H

void getCSVFilename(unsigned int,char *);
int readCalibData(char *Fname); 
int writeCalibData(char *Fname,unsigned int steps,LDRAttr ldrattn_t);

#endif
