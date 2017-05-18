/*
 *  ltc2655.c - Support for LTC26x6, LTC26x7 and LTC26x9 I2C DAC chips
 *
 *  Copyright (C) 2015 Marc Andre <marc.andre@xxxxxxxxxx>
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 */

#include <linux/module.h>
#include <linux/init.h>
#include <linux/slab.h>
#include <linux/jiffies.h>
#include <linux/i2c.h>
#include <linux/err.h>
#include <linux/regulator/consumer.h>

#include <linux/iio/iio.h>
#include <linux/iio/sysfs.h>

#include <linux/iio/machine.h>
#include <linux/iio/driver.h>
#include <linux/iio/consumer.h>
#include <linux/of.h>
#include "/root/linux/drivers/iio/iio_core.h"


#define LTC2655_DRV_NAME	"ltc2655"

#define MAX_CHANNEL		4

#define CHANNEL_ALL	(0x0F)
#define CHANNEL_1	(0)
#define CHANNEL_2	(1)
#define CHANNEL_3	(2)
#define CHANNEL_4	(3)

/* Commands to LTC2655 */
#define LTC2655_CMD_WR_INPUT_N		0x00 /* Write only register n */
#define LTC2655_CMD_UP_N		0x01 /* Update only register n */
#define LTC2655_CMD_WR_UP_ALL		0x02 /* Write & Update register n*/
#define LTC2655_CMD_WR_UP_N		0x03 /* Write & Update register n*/
#define LTC2655_CMD_PD_N		0x04 /* Power Down   n */
#define LTC2655_CMD_PD_ALL		0x05 /* Power Down all DAC */
#define LTC2655_CMD_PD_ALL		0x05 /* Power Down all DAC */
#define LTC2655_CMD_INTERNAL_REF	0x06 /* Select Internal Reference(Power-Up Reference)*/
#define LTC2655_CMD_EXTERNAL_REF	0x07 /* Select External Reference(Power-Up Reference)*/

//static int ltc2655_suspend(struct device *dev);
//static int ltc2655_resume(struct device *dev);

struct ltc2655_data {
	struct i2c_client	*client;
	unsigned short		reg_vref[MAX_CHANNEL];
	int channels;
};

//struct ldrattn {
//	struct device *dev;	
//	struct iio_channel *leftse;
//	struct iio_channel *leftsh;
//	struct iio_channel *rightse;
//	struct iio_channel *rightsh;
//	struct iio_channel *ileftse;
//	struct iio_channel *ileftsh;
//	struct iio_channel *irightse;
//	struct iio_channel *irightsh;
//	struct iio_channel *leftcalib;
//	struct iio_channel *rightcalib;
//};

//struct ldrattn *ldr;

/*
 * channel: channel no or 0xf for all channels
 * command: Command to LTC2655
 */
static int ltc2655_set_value(struct iio_dev *indio_dev,
			     long val, int channel, int command)
{
	struct ltc2655_data *data = iio_priv(indio_dev);
	struct i2c_client *client = data->client;
	u8 outbuf[3];
	int res;

	if (val < 0 || val >= 65536)
		return -EINVAL;

	printk(KERN_DEBUG "writing val:%ld on dac chan:%d\n", val, channel);

	outbuf[0] = (channel & 0xf) | ((command & 0x0f) << 4);
	outbuf[1] = (val >> 8) & 0xff;
	outbuf[2] = (val & 0xff);

	printk(KERN_DEBUG "writing %s cmd:%02X %02X %02X\n", __FUNCTION__, outbuf[0], outbuf[1], outbuf[2]);
	res = i2c_master_send(client, outbuf, 3);
	if (res < 0)
		return res;
	else if (res != 3)
		return -EIO;
	else
		return 0;
}



static int ltc2655_write_raw(struct iio_dev *indio_dev,
			     struct iio_chan_spec const *chan,
			     int val, int val2, long mask)
{
	int ret;

	switch (mask) {
	case IIO_CHAN_INFO_RAW:
		ret = ltc2655_set_value(indio_dev, val, chan->channel, LTC2655_CMD_WR_UP_N);
		break;
	default:
		ret = -EINVAL;
		break;
	}

	return ret;
}

#define LTC2655_PM_OPS NULL

static const struct iio_info ltc2655_info = {
	.write_raw = ltc2655_write_raw,
	.driver_module = THIS_MODULE,
};

#define LTC2655_CHANNEL(chan) {				\
	.type = IIO_VOLTAGE,				\
	.indexed = 1,					\
	.output = 1,					\
	.channel = (chan),				\
	.info_mask_separate = BIT(IIO_CHAN_INFO_RAW) |	\
	BIT(IIO_CHAN_INFO_SCALE),			\
}

static const struct iio_chan_spec ltc2655_channels[] = {
	LTC2655_CHANNEL(15), /* All channels simultanously */
	LTC2655_CHANNEL(0),
	LTC2655_CHANNEL(1),
	LTC2655_CHANNEL(2),
	LTC2655_CHANNEL(3),
};


static int ltc2655_probe(struct i2c_client *client,
			 const struct i2c_device_id *id)
{
	struct ltc2655_data *data;
	struct iio_dev *indio_dev;
	//struct iio_channel *chan;
	//struct ltc2655_platform_data *platform_data = client->dev.platform_data;
	int err;

	indio_dev = iio_device_alloc(sizeof(*data));
	if (!indio_dev) {
		err = -ENOMEM;
		goto exit;
	}
	data = iio_priv(indio_dev);
	i2c_set_clientdata(client, indio_dev);
	data->client = client;

	/* establish that the iio_dev is a child of the i2c device */
	indio_dev->dev.parent = &client->dev;

	/* Define channel count based on DAC type */
	indio_dev->num_channels = 5; //TODO : check this 
	data->channels = 4; //TODO: check this
	indio_dev->channels = ltc2655_channels;
	indio_dev->modes = INDIO_DIRECT_MODE;
	indio_dev->info = &ltc2655_info;


	/*
	 * Reference voltage on MAX518 and default is 5V, else take reg_vref 
	 * from platform_data
	*/
	data->reg_vref[0] = data->reg_vref[1] = data->reg_vref[2] = data->reg_vref[3] = 5000; /* mV */

	err = iio_device_register(indio_dev);
	if (err) {
		dev_err(&client->dev,
			"Failed to register iio device: %d. Aborting.",
			err);
		goto exit_free_device;
	}

	ltc2655_set_value(indio_dev, 0, CHANNEL_ALL, LTC2655_CMD_EXTERNAL_REF);
	dev_info(&client->dev, "LTC2655 DAC registered with EXTERNAL REFERENCE\n");

	
	//iio_channel_get(&client->dev,"leftse");
	//if (IS_ERR(ldr->leftse)) {
	//	printk(" ERROR redaing iio-channel\n");
	//}


	return 0;

exit_free_device:
	iio_device_free(indio_dev);
exit:
	return err;
}

static int ltc2655_remove(struct i2c_client *client)
{
	iio_device_unregister(i2c_get_clientdata(client));
	iio_device_free(i2c_get_clientdata(client));

	dev_dbg(&client->dev, "LTC2655 DAC unregistered\n");

	return 0;
}

static const struct i2c_device_id ltc2655_id[] = {
	{ "ltc2655", 0},
	{ }
};
MODULE_DEVICE_TABLE(i2c, ltc2655_id);

static const struct of_device_id ltc2655_dt_ids[] = {
	{ .compatible = "lltc,ltc2655", .data = (void *)&ltc2655_id[0] },
	{},
};
MODULE_DEVICE_TABLE(of, ltc2655_dt_ids);

static struct i2c_driver ltc2655_driver = {
	.driver = {
		.name	= LTC2655_DRV_NAME,
		.pm	= LTC2655_PM_OPS,
		.of_match_table = of_match_ptr(ltc2655_dt_ids),
	},
	.probe		= ltc2655_probe,
	.remove		= ltc2655_remove,
	.id_table	= ltc2655_id,
};
module_i2c_driver(ltc2655_driver);

MODULE_AUTHOR("Thanuja <>");
MODULE_DESCRIPTION("LTC26x6, LTC26x7 and LTC26x9 DAC driver");
MODULE_LICENSE("GPL");
