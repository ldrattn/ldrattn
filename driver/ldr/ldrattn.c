/*
 *  Nano River Technologies viperboard IIO ADC driver
 *
 *  (C) 2012 by Lemonage GmbH
 *  Author: Lars Poeschel <poeschel@lemonage.de>
 *  All rights reserved.
 *
 *  This program is free software; you can redistribute  it and/or modify it
 *  under  the terms of  the GNU General  Public License as published by the
 *  Free Software Foundation;  either version 2 of the	License, or (at your
 *  option) any later version.
 *
 */

#include <linux/kernel.h>
#include <linux/errno.h>
#include <linux/module.h>
#include <linux/slab.h>
#include <linux/types.h>
#include <linux/mutex.h>
#include <linux/cdev.h>
#include <linux/device.h>
#include <linux/platform_device.h>
#include <linux/uaccess.h>

#include <linux/usb.h>
#include <linux/iio/iio.h>
#include <linux/iio/machine.h>
#include <linux/iio/driver.h>
#include <linux/iio/consumer.h>
#include <linux/of.h>
#include "ldrattn.h"

#include "/root/linux/drivers/iio/iio_core.h"


#define float int
struct ldrattn {
	struct device *dev;	
	struct iio_channel *leftse;
	struct iio_channel *leftsh;
	struct iio_channel *rightse;
	struct iio_channel *rightsh;
	struct iio_channel *ileftse;
	struct iio_channel *ileftsh;
	struct iio_channel *irightse;
	struct iio_channel *irightsh;
	struct iio_channel *leftcalib;
	struct iio_channel *rightcalib;
};

struct ldrattn *ldr;
static const struct iio_chan_spec ldrattn_iio_channels = {
	.type = IIO_VOLTAGE,
	.info_mask_shared_by_type = BIT(IIO_CHAN_INFO_SCALE),
	.info_mask_separate = BIT(IIO_CHAN_INFO_RAW),
};

#if 0
static int ldrattn_iio_write_raw(struct iio_dev *indio_dev,
                               struct iio_chan_spec const *chan,
                               int val,
                               int val2,
                               long mask)
{
	unsigned int ret=0;
	printk("------ write raw \n");
	ret = iio_write_channel_raw(ldr->leftse,value);
#if 0	
	switch (mask) {
	case :
		break;
	default:
		break;
	}	

#endif
	return ret;
}

static int ldrattn_iio_read_raw(struct iio_dev *iio_dev,
				struct iio_chan_spec const *chan,
				int *val,
				int *val2,
				long info)
{
	unsigned int ret=0;
	struct ldrattn *ldr;
	int value;

	ldr = iio_priv(iio_dev);
	printk("------ read raw \n");
	//ret  = iio_read_channel_raw(ldr->adc_channel,&value);

	return ret;
}

static const struct iio_info ldrattn_iio_info = {
	.read_raw = &ldrattn_iio_read_raw,
	.write_raw = &ldrattn_iio_write_raw,
	.driver_module = THIS_MODULE,
};

#endif

#if 1

static dev_t ldrdev;
static int init_res;
static struct cdev c_dev;
static struct class *ldrclass;

static ssize_t ldr_read(struct file* F, char *buf, size_t count, loff_t *f_pos)
{
	printk("--- ldr read\n");
	return 0;
}
 
static ssize_t ldr_write(struct file* F, const char *buf, size_t count, loff_t *f_pos)
{
	printk("--- ldr write\n");
	//ret = iio_write_channel_raw(ldr->leftse,value);
	return 0;
}
 
static long ldr_ioctl(struct file *file, unsigned int cmd, unsigned long arg)
{
	int ret=0;
	int data;
	data =(int) arg;
	printk("--- ldr ioctl\n");
	switch(cmd) {
		case LDR_IOCTL_WR_CHAN1:	/* write from channel 0 */
		{	
			ret = iio_write_channel_raw(ldr->leftse,data);
			break;
		}	
		case LDR_IOCTL_WR_CHAN2:
		{
			ret = iio_write_channel_raw(ldr->leftsh,data);
			break;
		} 	
		case LDR_IOCTL_WR_CHAN3:
		{
			ret = iio_write_channel_raw(ldr->rightse,data);
			break;
		} 	
		case LDR_IOCTL_WR_CHAN4:
		{

			ret = iio_write_channel_raw(ldr->rightsh,data);
			break;
		} 	
		case LDR_IOCTL_RD_CHAN1:
		{
			iio_read_channel_raw(ldr->ileftse,&data);
			printk("Data read from DAC1 %d \n",data);
			ret = data;	
			break;
		} 	
		case LDR_IOCTL_RD_CHAN2:
		{
			iio_read_channel_raw(ldr->ileftsh,&data);
			printk("Data read from DAC2 %d \n",data);
			ret = data;	
			break;
		}
		case LDR_IOCTL_RD_CHAN3:
		{
			iio_read_channel_raw(ldr->irightse,&data);
			printk("Data read from DAC3 %d \n",data);
			ret = data;	
			break;
		} 	
 		case LDR_IOCTL_RD_CHAN4:
		{
			iio_read_channel_raw(ldr->irightsh,&data);
			printk("Data read from DAC4 %d \n",data);
			ret = data;	
			break;
		} 	
		case LDR_IOCTL_RD_CHAN5:
		{
			iio_read_channel_raw(ldr->leftcalib,&data);
			printk("Data read from DAC5 %d \n",data);
			ret = data;	
			break;
		} 	
		case LDR_IOCTL_RD_CHAN6:
		{
			iio_read_channel_raw(ldr->rightcalib,&data);
			printk("Data read from DAC6 %d \n",data);
			ret = data;	
			break;
		} 	

		default:
			return -EINVAL;
	}
	return ret;
}


static int ldr_open(struct inode *inode, struct file *file)
{
    return 0;
}
 
static int ldr_close(struct inode *inode, struct file *file)
{
    return 0;

}



static struct file_operations FileOps =
{
    .owner                = THIS_MODULE,
    .open                 = ldr_open,
    .read                 = ldr_read,
    .write                = ldr_write,
    .release              = ldr_close,
    .unlocked_ioctl        = ldr_ioctl,
};

static int ldrattn_init(void)
{
	
	init_res = alloc_chrdev_region( &ldrdev, 0, 1, "ldr_drv" );
	if(init_res < 0) {
		printk( "LDR Device Registration failed\n" );
		return -1;
	}

	if ( (ldrclass = class_create( THIS_MODULE, "chardev" ) ) == NULL )
	{
		printk( " LDR Class creation failed\n" );
		unregister_chrdev_region(ldrdev, 1 );
		return -1;
	}

	if( device_create( ldrclass, NULL, ldrdev, NULL, "ldr_drv" ) == NULL )
	{
		printk( "LDR Device creation failed\n" );
		class_destroy(ldrclass);
		unregister_chrdev_region( ldrdev, 1 );
		return -1;
	}

	cdev_init( &c_dev, &FileOps );

	if( cdev_add( &c_dev, ldrdev, 1 ) == -1)
	{
		printk( "LDR Device addition failed\n" );
		device_destroy( ldrclass, ldrdev );
		class_destroy( ldrclass );
		unregister_chrdev_region( ldrdev, 1 );
		return -1;
	}
	return 0;
}

static void ldrattn_exit(void)
{
	cdev_del(&c_dev);
	device_destroy( ldrclass, ldrdev );
	class_destroy( ldrclass );
	unregister_chrdev_region( ldrdev, 1 );
}

//module_init(ldrattn_init);
//module_exit(ldrattn_exit);
#endif

static int ldrattn_probe(struct platform_device *pdev)
{
	int ret ;
	const char name="testin";
	char buff[7];
	struct iio_channel *chan;
	printk("-----------ldr driver  probe function called  \n");

#if 1
	printk("-----------ldr driver  \n");
	ldr = devm_kzalloc(&pdev->dev, sizeof(*ldr), GFP_KERNEL);
	if (!ldr)
		return -ENOMEM;

	platform_set_drvdata(pdev, ldr);	
	ldr->dev = &pdev->dev;

		
#endif
#if 1
	ldr->leftse = iio_channel_get(&pdev->dev,"leftse");
	if (IS_ERR(ldr->leftse)) {
	        dev_err(&pdev->dev, "could not get iio channel dac");
		ret = -1;
	        goto error_ldr;
	}


	ldr->leftsh = iio_channel_get(ldr->dev,"leftsh");
	if (IS_ERR(ldr->leftsh)) {
	        dev_err(&pdev->dev, "could not get iio channel (dac)");
		ret = -1;
	        goto error_leftse;
	}


	ldr->rightse= iio_channel_get(ldr->dev,"rightse");
	if (IS_ERR(ldr->rightse)) {
	        dev_err(&pdev->dev, "could not get iio channel (dac)");
		ret = -1;
	        goto error_leftsh;
	}


	ldr->rightsh= iio_channel_get(ldr->dev,"rightsh");
	if (IS_ERR(ldr->rightsh)) {
	        dev_err(&pdev->dev, "could not get iio channel (dac)");
		ret = -1;
	        goto error_rightse;
	}


	ldr->ileftse = iio_channel_get(ldr->dev,"ileftse");
	if (IS_ERR(ldr->ileftse)) {
	        dev_err(&pdev->dev, "could not get iio channel (adc)");
		ret = -1;
	        goto error_rightsh;
	}


	ldr->ileftsh= iio_channel_get(ldr->dev,"ileftsh");
	if (IS_ERR(ldr->ileftsh)) {
	        dev_err(&pdev->dev, "could not get iio channel (adc)");
		ret = -1;
	        goto error_ileftse;
	}

	ldr->irightse= iio_channel_get(ldr->dev,"irightse");
	if (IS_ERR(ldr->irightse)) {
	        dev_err(&pdev->dev, "could not get iio channel (adc)");
		ret = -1;
	        goto error_ileftsh;
	}

	ldr->irightsh= iio_channel_get(ldr->dev,"irightsh");
	if (IS_ERR(ldr->irightsh)) {
	        dev_err(&pdev->dev, "could not get iio channel (adc)");
		ret = -1;
	        goto error_irightse;
	}

	ldr->leftcalib= iio_channel_get(ldr->dev,"leftcalib");
	if (IS_ERR(ldr->leftcalib)) {
	        dev_err(&pdev->dev, "could not get iio channel (adc)");
		ret = -1;
	        goto error_irightsh;
	}

	ldr->rightcalib= iio_channel_get(ldr->dev,"rightcalib");
	if (IS_ERR(ldr->rightcalib)) {
	        dev_err(&pdev->dev, "could not get iio channel (adc)");
		ret = -1;
	        goto error_leftcalib;
	}

#endif
	ldrattn_init();
	return 0;

error_leftcalib:
	iio_channel_release(ldr->leftcalib);
error_irightsh:
	iio_channel_release(ldr->irightsh);
error_irightse:
	iio_channel_release(ldr->irightse);
error_ileftse:
	iio_channel_release(ldr->ileftse);
error_ileftsh:
	iio_channel_release(ldr->ileftsh);
error_rightsh:
	iio_channel_release(ldr->rightsh);
error_rightse:
	iio_channel_release(ldr->rightse);
error_leftsh:
	iio_channel_release(ldr->leftsh);
error_leftse:
	iio_channel_release(ldr->leftse);
error_ldr:
//	iio_device_unregister(indio_dev);
//error:
//        iio_device_free(indio_dev);
        return ret;
}

static int ldrattn_remove(struct platform_device *pdev)
{
	struct iio_dev *indio_dev = platform_get_drvdata(pdev);
	struct ldrattn *ldr;
	ldr = iio_priv(indio_dev);

	iio_channel_release(ldr->rightcalib);
	iio_channel_release(ldr->leftcalib);
	iio_channel_release(ldr->irightsh);
	iio_channel_release(ldr->irightse);
	iio_channel_release(ldr->ileftsh);
	iio_channel_release(ldr->ileftse);
	iio_channel_release(ldr->rightsh);
	iio_channel_release(ldr->rightse);
	iio_channel_release(ldr->leftsh);
	iio_channel_release(ldr->leftse);
	//iio_device_unregister(indio_dev);
	//iio_device_free(indio_dev);

	ldrattn_exit();
	return 0;
}


#ifdef CONFIG_OF
static struct of_device_id ldrattn_dt_ids[] = {
        { .compatible = "ldrattn", },
        {},
};
MODULE_DEVICE_TABLE(of, ldrattn_dt_ids);
#endif

static struct platform_driver ldrattn_driver = {
	.driver = {
		.name	= "ldrattn",
		.owner	= THIS_MODULE,
	        .of_match_table = of_match_ptr(ldrattn_dt_ids),
	},
	.probe		= ldrattn_probe,
	.remove		= ldrattn_remove,
};



module_platform_driver(ldrattn_driver);
MODULE_AUTHOR(" Thanuja <>");
MODULE_DESCRIPTION("IIO LDR Attenuation driver");
MODULE_LICENSE("GPL");
MODULE_ALIAS("platform:ldrattn");
