
#include <stdio.h>
#include <stdlib.h>
#include <syslog.h>
#include "logger.h"

#if 0
const char *sysLogFile = "/var/log/ldrattnapp.log";



void openLog()
{
	openlog(sysLogFile, LOG_PID|LOG_CONS|LOG_NDELAY, LOG_USER);	
}
#endif

void calibLog(char *fmt,...)
{
	//syslog(level,fmt);
	syslog(LOG_DEBUG,fmt);
}
void debugLog(char *fmt,...)
{
//	int level = LOG_LOCAL0;
//	syslog(level,fmt);
	//syslog(LOG_INFO,fmt);
	syslog(LOG_INFO,fmt);
	//syslog(LOG_INFO,fmt);
//	syslog(LOG_INFO,"%s",fmt);
}

void closeLog()
{
	closelog();
}
