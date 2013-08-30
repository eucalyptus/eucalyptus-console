# Copyright 2012 Eucalyptus Systems, Inc.
#
# Redistribution and use of this software in source and binary forms,
# with or without modification, are permitted provided that the following
# conditions are met:
#
#   Redistributions of source code must retain the above copyright notice,
#   this list of conditions and the following disclaimer.
#
#   Redistributions in binary form must reproduce the above copyright
#   notice, this list of conditions and the following disclaimer in the
#   documentation and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
# A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
# OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
# LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
# DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
# THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

from distutils.command.build_py import build_py
from distutils.command.sdist import sdist
from distutils.core import setup
import glob
import os.path
import shutil

from eucaconsole import __version__


DATA_DIR='/usr/share/eucalyptus-console'


def getDataFiles(path):
    return [ (os.path.join(DATA_DIR, root),
        [ os.path.join(root, f) for f in files ])
            for root, _, files in os.walk(path, followlinks=True) if files ]

data_files = getDataFiles("static")
data_files.append(('/etc/eucalyptus-console', ['eucaconsole/console.ini']))


# Overwrite console.ini with the default version
# We want to make sure we don't include the developer config
if os.path.isfile('eucaconsole/console.ini'):
    shutil.move('eucaconsole/console.ini', 'eucaconsole/console.ini.bak')
shutil.copyfile('eucaconsole/console.ini.default', 'eucaconsole/console.ini')


class build_py_with_git_version(build_py):
    '''Like build_py, but also hardcoding the version in version.__version__
       so it's consistent even outside of the source tree'''

    def build_module(self, module, module_file, package):
        build_py.build_module(self, module, module_file, package)
        print module, module_file, package
        if module == 'version' and '.' not in package:
            version_line = "__version__ = '{0}'\n".format(__version__)
            old_ver_name = self.get_module_outfile(self.build_lib, (package,),
                                                    module)
            new_ver_name = old_ver_name + '.new'
            with open(new_ver_name, 'w') as new_ver:
                with open(old_ver_name) as old_ver:
                    for line in old_ver:
                        if line.startswith('__version__ ='):
                            new_ver.write(version_line)
                        else:
                            new_ver.write(line)
                new_ver.flush()
            os.rename(new_ver_name, old_ver_name)


class sdist_with_git_version(sdist):
    '''Like sdist, but also hardcoding the version in version.__version__ so
       it's consistent even outside of the source tree'''

    def make_release_tree(self, base_dir, files):
        sdist.make_release_tree(self, base_dir, files)
        version_line = "__version__ = '{0}'\n".format(__version__)
        old_ver_name = os.path.join(base_dir, 'eucaconsole/version.py')
        new_ver_name = old_ver_name + '.new'
        with open(new_ver_name, 'w') as new_ver:
            with open(old_ver_name) as old_ver:
                for line in old_ver:
                    if line.startswith('__version__ ='):
                        new_ver.write(version_line)
                    else:
                        new_ver.write(line)
            new_ver.flush()
        os.rename(new_ver_name, old_ver_name)


setup (name="eucaconsole",
    version = __version__,
    description = "Eucalyptus User Interface Console",
    long_description = "Eucalyptus User Interface Console",
    author = "Sang-Min Park, David Kavanagh, Vasiliy Kochergin",
    author_email = "community@eucalyptus.com",
    license = "GPL v3",
    url = "http://www.eucalyptus.com",
    packages = ['eucaconsole'],
    package_data={'eucaconsole': ['eucaconsole/console.ini']},
    scripts = ['euca-console-server'],
    data_files = data_files,
    cmdclass = {'build_py': build_py_with_git_version,
                'sdist': sdist_with_git_version}
)
