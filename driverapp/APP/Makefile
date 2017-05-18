CC=gcc
CFLAGS = -Wall -g 
ODIR = obj
APP =  ldrattnapp
CLIENT = client
STATIC=libcsv.a
AR=ar
MKDIR=mkdir
CP=cp
BINPATH=/usr/local/sbin

LIBS=-lm -lpthread

_DEPS = debug.h 
DEPS = $(patsubst %,$(IDIR)/%,$(_DEPS))

_OBJ = debug.o action.o csvparser.o cfgparser.o logger.o ldrattnapp.o 
OBJ = $(patsubst %,$(ODIR)/%,$(_OBJ))

_COBJ = client.o
COBJ = $(patsubst %,$(ODIR)/%,$(_COBJ))

_SOBJ = libcsv.o
SOBJ = $(patsubst %,$(ODIR)/%,$(_SOBJ))
 
all: $(STATIC) $(APP) $(CLIENT) 

$(STATIC): $(SOBJ) 
	$(AR) rcs $(STATIC) $(SOBJ) 
	
$(ODIR)/%.o: %.c 
	$(MKDIR) -p $(ODIR) 
	$(CC) -c -o $@ $< $(CFLAGS)

$(APP): $(OBJ) 
	$(CC) -o $@ $^ $(CFLAGS) $(LIBS) $(STATIC)

$(CLIENT): $(COBJ)
	$(CC) -o $@ $^ $(CFLAGS)

install: 
	$(CP) $(APP) $(BINPATH) 
	$(CP) $(CLIENT) $(BINPATH)
 
.PHONY: clean

clean:
	rm -f $(ODIR)/*.o *~ core $(INCDIR)/*~ $(APP) $(STATIC) $(CLIENT) 
