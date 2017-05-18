#include <linux/types.h>
#include <linux/ioctl.h>
#include <linux/magic.h>
//#include <linux/bug.h>


#define LDR_IOCTL_IDENT               'l'

#define LDR_IOCTL_WR_CHAN1\
        _IOW(LDR_IOCTL_IDENT, 0x80, __u32)
#define LDR_IOCTL_WR_CHAN2\
        _IOW(LDR_IOCTL_IDENT, 0x81, __u32)
#define LDR_IOCTL_WR_CHAN3\
        _IOW(LDR_IOCTL_IDENT, 0x82, __u32)
#define LDR_IOCTL_WR_CHAN4\
        _IOW(LDR_IOCTL_IDENT, 0x83, __u32)
#define LDR_IOCTL_RD_CHAN1\
        _IOR(LDR_IOCTL_IDENT, 0x84, __u32)
#define LDR_IOCTL_RD_CHAN2\
        _IOR(LDR_IOCTL_IDENT, 0x85, __u32)
#define LDR_IOCTL_RD_CHAN3\
        _IOR(LDR_IOCTL_IDENT, 0x86, __u32)
#define LDR_IOCTL_RD_CHAN4\
        _IOR(LDR_IOCTL_IDENT, 0x87, __u32)
#define LDR_IOCTL_RD_CHAN5\
        _IOR(LDR_IOCTL_IDENT, 0x88, __u32)
#define LDR_IOCTL_RD_CHAN6\
        _IOR(LDR_IOCTL_IDENT, 0x89, __u32)
