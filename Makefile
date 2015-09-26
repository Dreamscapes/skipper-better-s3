# skipper-better-s3
#
# @author      Robert Rossmann <rr.rossmann@me.com>
# @copyright   2015 STRV
# @license     http://choosealicense.com/licenses/bsd-3-clause  BSD-3-Clause License

# Default - Run it all! (except for coveralls - that should be run only from Travis)
all: install lint docs

include targets/nodejs/base.mk
include targets/nodejs/install.mk
include targets/nodejs/lint.mk
include targets/nodejs/docs.mk

# Project-specific information
lintfiles = lib
