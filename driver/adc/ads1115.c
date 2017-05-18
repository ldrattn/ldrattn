/*
 * ads1115.c - lm_sensors driver for ads1115 16-bit 4-input ADC
 * (C) Copyright 2010
 * Dirk Eibach, Guntermann & Drunck GmbH <eibach@gdsys.de>
 *
 * Based on the ads7828 driver by Steve Hardy.
 *
 * Datasheet available at: http://focus.ti.com/lit/ds/symlink/ads1115.pdf
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.
 */

#include <linux/module.h>
#include <linux/init.h>
#include <linux/slab.h>
#include <linux/delay.h>
#include <linux/i2c.h>
#include <linux/err.h>
#include <linux/mutex.h>
#include <linux/iio/iio.h>
#include <linux/of.h>

#define ADS1115_CHANNELS 4
#define SINGLE_CHANNEL_IP	4

struct ads1115_channel_data {
        bool enabled;
        unsigned int pga;
        unsigned int data_rate;
};

struct ads1115_platform_data {
        struct ads1115_channel_data channel_data[ADS1115_CHANNELS];
};


#define ADCATTN_ATTR(_name, _mode, _show, _store, _index)       \
        { .dev_attr = __ATTR(_name, _mode, _show, _store),      \
          .index = _index }



/* ADS1115 registers */
enum {
        ADS1115_CONVERSION = 0,
        ADS1115_CONFIG = 1,
};

/* PGA fullscale voltages in mV */
static const unsigned int fullscale_table[8] = {
        6144, 4096, 2048, 1024, 512, 256, 256, 256 };

/* Data rates in samples per second */
static const unsigned int data_rate_table[8] = {
        8, 16, 32, 64, 128, 250, 475, 860};

#define ADS1115_DEFAULT_CHANNELS 0xff
#define ADS1115_DEFAULT_PGA 1
#define ADS1115_DEFAULT_DATA_RATE 6

struct ads1115_data {
        struct i2c_client *i2c;
        //struct mutex update_lock; /* mutex protect updates */
        struct ads1115_channel_data channel_data[ADS1115_CHANNELS];
};

static int ads1115_reg_to_mv(struct i2c_client *client, unsigned int channel,
			     s16 reg)
{
        struct iio_dev *iio = i2c_get_clientdata(client);
        struct ads1115_data *data = iio_priv(iio);
	unsigned int pga = data->channel_data[channel].pga;
	int fullscale = fullscale_table[pga];

	return DIV_ROUND_CLOSEST(reg * fullscale, 0x7fff);
}

static int ads1115_read_raw(struct iio_dev *iio,
                            struct iio_chan_spec const *chan, int *value,
                            int *shift, long mask)
{

        u16 config;
        //struct ads1115_data *data = i2c_get_clientdata(client);
        struct ads1115_data *data = iio_priv(iio);
	unsigned int channel = chan->channel;
        unsigned int pga = data->channel_data[channel].pga;
        unsigned int data_rate = data->channel_data[channel].data_rate;
        unsigned int conversion_time_ms;
        int res;
	int single_channel_ip;
        //mutex_lock(&data->update_lock);

        /* get channel parameters */
        res = i2c_smbus_read_word_swapped(data->i2c, ADS1115_CONFIG);
        if (res < 0)
                goto err_unlock;
        config = res;
        conversion_time_ms = DIV_ROUND_UP(1000, data_rate_table[data_rate]);

	single_channel_ip = channel + SINGLE_CHANNEL_IP;
        /* setup and start single conversion */
        config &= 0x001f;
        config |= (1 << 15) | (1 << 8);
        config |= (single_channel_ip & 0x0007) << 12;
        config |= (pga & 0x0007) << 9;
        config |= (data_rate & 0x0007) << 5;


        res = i2c_smbus_write_word_swapped(data->i2c, ADS1115_CONFIG, config);
        if (res < 0)
                goto err_unlock;

        /* wait until conversion finished */
        msleep(conversion_time_ms);
        res = i2c_smbus_read_word_swapped(data->i2c, ADS1115_CONFIG);
        if (res < 0)
                goto err_unlock;
        config = res;

	printk(KERN_DEBUG "ADC1115 config chan:%d read:%d \n", channel, res);

        if (!(config & (1 << 15))) {
                /* conversion not finished in time */
                res = -EIO;
                goto err_unlock;
        }

        res = i2c_smbus_read_word_swapped(data->i2c, ADS1115_CONVERSION);

	printk(KERN_DEBUG "ADC1115 chan:%d read:%d from id %d\n", channel, res,iio->id);
#if 0
	if(!(channel==2 || channel ==3)){
		res = ads1115_reg_to_mv(data->i2c, channel, res);
		printk(KERN_DEBUG "ADC1115 chan:%d mv:%d\n", channel, res);
	}
#endif

	*value = (unsigned int)res;

	return IIO_VAL_INT;

err_unlock:
        //mutex_unlock(&data->update_lock);
        return -EINVAL;
}

#if 0


/* sysfs callback function */
static ssize_t show_in(struct device *dev, struct device_attribute *da,
        char *buf)
{
        struct ldrattn_device_attribute *attr = to_ldrattn_dev_attr(da);
        struct i2c_client *client = to_i2c_client(dev);
        int res;
        int index = attr->index;

        res = ads1115_read_adc(client, index);
        if (res < 0)
                return res;

        return sprintf(buf, "%d\n", ads1115_reg_to_mv(client, index, res));
}

static const struct adcattn_device_attribute ads1115_in[] = {
        ADCATTN_ATTR(in0_input, S_IRUGO, show_in, NULL, 0),
        ADCATTN_ATTR(in1_input, S_IRUGO, show_in, NULL, 1),
        ADCATTN_ATTR(in2_input, S_IRUGO, show_in, NULL, 2),
        ADCATTN_ATTR(in3_input, S_IRUGO, show_in, NULL, 3),
        ADCATTN_ATTR(in4_input, S_IRUGO, show_in, NULL, 4),
        ADCATTN_ATTR(in5_input, S_IRUGO, show_in, NULL, 5),
        ADCATTN_ATTR(in6_input, S_IRUGO, show_in, NULL, 6),
        ADCATTN_ATTR(in7_input, S_IRUGO, show_in, NULL, 7),
};


#endif
static void ads1115_get_channels_config(struct i2c_client *client)
{
        unsigned int k;

        struct iio_dev *iio = i2c_get_clientdata(client);
        struct ads1115_data *data = iio_priv(iio);
        struct ads1115_platform_data *pdata = dev_get_platdata(&client->dev);

        /* prefer platform data */
        if (pdata) {
                memcpy(data->channel_data, pdata->channel_data,
                       sizeof(data->channel_data));
                return;
        }

        /* fallback on default configuration */
        for (k = 0; k < ADS1115_CHANNELS; ++k) {
                data->channel_data[k].enabled = true;
		//if(iio->id == 2) 
	        data->channel_data[k].pga = ADS1115_DEFAULT_PGA;
               	data->channel_data[k].data_rate = ADS1115_DEFAULT_DATA_RATE;
        }
}



#define ADS1115_V_CHAN(index)                                            \
        {                                                               \
                .type = IIO_VOLTAGE,                                    \
                .indexed = 1,                                           \
                .channel = index,                                       \
        	.info_mask_shared_by_type = BIT(IIO_CHAN_INFO_SCALE),   \
	        .info_mask_separate = BIT(IIO_CHAN_INFO_RAW),           \
        }


static const struct iio_chan_spec ads1115_channel[ADS1115_CHANNELS] = {
        ADS1115_V_CHAN(0),
        ADS1115_V_CHAN(1),
        ADS1115_V_CHAN(2),
        ADS1115_V_CHAN(3),

};


static const struct iio_info ads1115_info = {
        .read_raw = ads1115_read_raw,
        .driver_module = THIS_MODULE,
};

static int ads1115_probe(struct i2c_client *client,
                         const struct i2c_device_id *id)
{
	struct iio_dev *iio;
        struct ads1115_data *data;
        int err; 
        //unsigned int k;
	
        if (!i2c_check_functionality(client->adapter, I2C_FUNC_SMBUS_WORD_DATA))
                return -ENODEV;

        iio = iio_device_alloc(sizeof(*data));
        if (!iio)
                return -ENOMEM;

        data = iio_priv(iio);
        data->i2c = client;

        iio->dev.parent = &client->dev;
        iio->name = dev_name(&client->dev);
        iio->modes = INDIO_DIRECT_MODE;
        iio->info = &ads1115_info;

        iio->channels = &ads1115_channel;  //check this
        iio->num_channels = 4;
	printk(" the i2c name is %s   %s %d\n",id->name,iio->name,iio->id);
#if 0
        for (k = 0; k < ADS1115_CHANNELS; ++k) {
                if (!data->channel_data[k].enabled)
                        continue;
                err = device_create_file(&client->dev, &ads1115_in[k].dev_attr);
                if (err)
                        goto iio_free;
        }


#endif

        err = iio_device_register(iio);
        if (err < 0)
                goto iio_free;
        i2c_set_clientdata(client, iio);

        ads1115_get_channels_config(client);
        return 0;

iio_free:
        iio_device_free(iio);

        return err;

}

static int ads1115_remove(struct i2c_client *client)
{
        struct iio_dev *iio = i2c_get_clientdata(client);
        //struct ads1115_data *data = iio_priv(iio);

        iio_device_unregister(iio);
        iio_device_free(iio);

        return 0;
}


static const struct i2c_device_id ads1115_id[] = {
        { "ads1115", 0 },
        { }
};
MODULE_DEVICE_TABLE(i2c, ads1115_id);

static struct i2c_driver ads1115_driver = {
        .driver = {
                .name = "ads1115",
		.owner = THIS_MODULE,
        },
        .probe = ads1115_probe,
        .remove = ads1115_remove,
        .id_table = ads1115_id,
};

module_i2c_driver(ads1115_driver);

MODULE_AUTHOR("Dirk Eibach <eibach@gdsys.de>");
MODULE_DESCRIPTION("ADS1115 driver");
MODULE_LICENSE("GPL");
